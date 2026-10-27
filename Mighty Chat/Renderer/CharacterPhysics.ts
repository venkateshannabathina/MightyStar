import "@babylonjs/core/Physics/v2/physicsEngineComponent";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { IMmdPhysics, IMmdPhysicsModel } from "babylon-mmd/esm/Runtime/Physics/IMmdPhysics";

type BuildArguments = Parameters<IMmdPhysics["buildPhysics"]>;
export type PhysicsStatus = {available:boolean;enabled:boolean;status:"off"|"loading"|"on"|"error"|"unavailable";bodies:number;jiggleAvailable:boolean;jiggleEnabled:boolean;jiggleBodies:number;detail:string};

/** A stable runtime adapter lets physics toggle without rebuilding the skeleton
 * or restarting the idle clock. Havok is loaded locally only on first use.
 */
class TogglePhysicsModel implements IMmdPhysicsModel {
    public inner?: IMmdPhysicsModel;
    public suspended = false;
    public resetPending = false;
    public disposed = false;
    public jiggleEnabled = true;
    private maskedStates = new Uint8Array(0);
    public readonly jiggleIndices: number[] = [];
    public constructor(public readonly args: BuildArguments, private readonly detached: () => void) {
        args[2].forEach((body,index)=>{
            const bone = args[1][body.boneIndex];
            if (body.physicsMode !== 0 && /胸|乳|breast|bust|jiggle/i.test(body.name + " " + (bone?.name ?? ""))) this.jiggleIndices.push(index);
        });
    }
    public get needDeoptimize(): boolean { return !this.inner || this.suspended || this.inner.needDeoptimize; }
    public commitBodyStates(states:Uint8Array): void {
        if (this.suspended || !this.inner) return;
        if (this.jiggleEnabled || !this.jiggleIndices.length) { this.inner.commitBodyStates(states); return; }
        if (this.maskedStates.length !== states.length) this.maskedStates = new Uint8Array(states.length);
        this.maskedStates.set(states);
        for (const index of this.jiggleIndices) this.maskedStates[index] = 0;
        this.inner.commitBodyStates(this.maskedStates);
    }
    public initialize(): void { this.resetPending = true; }
    public syncBodies(): void {
        if (!this.inner || this.suspended) return;
        if (this.resetPending) { this.inner.initialize(); this.resetPending = false; }
        this.inner.syncBodies();
    }
    public syncBones(): void { if (!this.suspended) this.inner?.syncBones(); }
    public disable(): void { this.inner?.dispose(); this.inner = undefined; this.resetPending = false; }
    public dispose(): void { this.disposed = true; this.disable(); this.detached(); }
}

export class CharacterPhysics implements IMmdPhysics {
    private model?: TogglePhysicsModel;
    private builder?: IMmdPhysics;
    private loading?: Promise<IMmdPhysics>;
    private wanted = false;
    private running = true;
    private editing = false;
    private jiggle = true;
    private disposed = false;
    private generation = 0;
    private accumulator = 0;
    private state: PhysicsStatus = {available:false,enabled:false,status:"unavailable",bodies:0,jiggleAvailable:false,jiggleEnabled:false,jiggleBodies:0,detail:"No physics rig on this character."};

    public constructor(private readonly scene:Scene, private readonly changed:(state:PhysicsStatus)=>void,
        private readonly loadBuilder:()=>Promise<IMmdPhysics> = async () => {
            const [{default:Havok},{HavokPlugin},{MmdPhysics}] = await Promise.all([
                import("@babylonjs/havok"), import("@babylonjs/core/Physics/v2/Plugins/havokPlugin"), import("babylon-mmd/esm/Runtime/Physics/mmdPhysics")
            ]);
            const instance = await Havok({locateFile:()=>new URL("./assets/HavokPhysics.wasm",window.location.href).href});
            if (this.disposed || this.scene.isDisposed) throw new Error("Physics view closed.");
            const plugin = new HavokPlugin(true,instance);
            // MMD units are approximately decimetres; keep authored constraints.
            if (!this.scene.enablePhysics(new Vector3(0,-98,0),plugin)) { plugin.dispose(); throw new Error("Physics engine could not start."); }
            // Animation, targets, solver and bone feedback share one fixed clock.
            // Scene substeps alone reuse a stale animated pose on slow overlays.
            this.scene.getPhysicsEngine()!.setSubTimeStep(0);
            this.scene.physicsEnabled = false;
            return new MmdPhysics(this.scene);
        }) {}

    public buildPhysics(...args:BuildArguments): IMmdPhysicsModel {
        this.detach();
        const model = new TogglePhysicsModel(args,()=>{if (this.model === model) this.detach();});
        this.model = model; model.jiggleEnabled = this.jiggle;
        const bodies = args[2].filter(body=>body.physicsMode !== 0).length;
        this.state = {available:bodies>0,enabled:false,status:bodies>0?"off":"unavailable",bodies,jiggleAvailable:model.jiggleIndices.length>0,jiggleEnabled:false,jiggleBodies:model.jiggleIndices.length,
            detail:bodies>0?"Hair, clothes and secondary motion.":"No dynamic physics bodies on this character."};
        this.emit();
        return model;
    }
    public inspect(): PhysicsStatus { return {...this.state,jiggleEnabled:this.state.enabled && this.jiggle && this.state.jiggleAvailable}; }
    public setJiggle(enabled:boolean): void {
        if (this.jiggle === enabled) return;
        this.jiggle = enabled;
        if (this.model) { this.model.jiggleEnabled = enabled; this.model.initialize(); }
        this.emit();
    }
    public setRunning(running:boolean): void { this.running = running; this.syncStep(); }
    public setEditing(editing:boolean): void {
        if (this.editing === editing) return;
        this.editing = editing;
        if (this.model) { this.model.suspended = editing; if (!editing) this.model.initialize(); }
        this.syncStep();
    }
    public async setEnabled(enabled:boolean,retry=false): Promise<void> {
        // Settings arrive on every pose edit. Do not reload or reset simulation.
        if (!retry && enabled === this.wanted && (this.state.status === "error" || this.state.enabled || this.state.status === "loading" || !enabled || !this.state.available)) return;
        this.wanted = enabled;
        const generation = ++this.generation, model = this.model;
        if (!enabled || !model || !this.state.available) {
            model?.disable();
            this.state = {...this.state,enabled:false,status:this.state.available?"off":"unavailable",detail:this.state.available?"Hair, clothes and secondary motion.":this.state.detail}; this.emit(); this.syncStep(); return;
        }
        this.state = {...this.state,status:"loading",detail:"Starting physics…"}; this.emit();
        try {
            const builder = this.builder ?? await (this.loading ??= this.loadBuilder());
            if (this.disposed || generation !== this.generation || this.model !== model || model.disposed || !this.wanted) return;
            this.builder = builder;
            model.inner = builder.buildPhysics(...model.args);
            model.suspended = this.editing; model.initialize();
            this.state = {...this.state,enabled:true,status:"on",detail:"Hair, clothes and secondary motion."};
            this.emit(); this.syncStep();
        } catch {
            if (this.disposed || generation !== this.generation) return;
            this.loading = undefined; this.wanted = false; model.disable();
            this.state = {...this.state,enabled:false,status:"error",detail:"Physics could not start. Turn it on to retry."}; this.emit(); this.syncStep();
        }
    }
    public reset(): void { this.model?.initialize(); }
    public advance(deltaSeconds:number, before:(seconds:number)=>void, after:()=>void): void {
        const delta = Number.isFinite(deltaSeconds) ? Math.max(0,Math.min(.1,deltaSeconds)) : 0;
        if (!this.state.enabled || !this.running || this.editing || delta === 0) {
            this.accumulator = 0;
            before(delta); after();
            return;
        }
        const step = 1/120;
        this.accumulator += delta;
        while (this.accumulator + 1e-10 >= step) {
            before(step);
            this.scene._advancePhysicsEngineStep(step*1000);
            after();
            this.accumulator = Math.max(0,this.accumulator-step);
        }
    }
    private emit(): void { if (!this.disposed) this.changed(this.inspect()); }
    // advance() owns stepping; Scene.render must never step the same world again.
    private syncStep(): void { this.scene.physicsEnabled = false; }
    public detach(): void {
        ++this.generation; this.wanted = false;
        this.accumulator = 0;
        this.model?.disable(); this.model = undefined;
        this.state = {available:false,enabled:false,status:"unavailable",bodies:0,jiggleAvailable:false,jiggleEnabled:false,jiggleBodies:0,detail:"No physics rig on this character."};
        this.syncStep();
    }
    public dispose(): void { this.disposed = true; this.detach(); }
}
