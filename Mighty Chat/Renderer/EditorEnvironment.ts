import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { ShadowOnlyMaterial } from "@babylonjs/materials/shadowOnly/shadowOnlyMaterial";
import type { Scene } from "@babylonjs/core/scene";

/** The neutral, infinite grid stage belongs only to the character editor. */
export class EditorEnvironment {
    private readonly ground;
    private readonly shadowGround;
    private readonly grid: ShaderMaterial;
    private readonly shadowMaterial: ShadowOnlyMaterial;
    private readonly sun: DirectionalLight;
    private shadows: ShadowGenerator | undefined;
    private enabled = false;
    private height = 18;

    public constructor(private readonly scene: Scene) {
        this.grid = new ShaderMaterial("editor distance-faded grid", scene, {
            vertexSource: `precision highp float;
                attribute vec3 position;
                uniform mat4 worldViewProjection;
                uniform mat4 world;
                varying vec3 worldPosition;
                void main() {
                    worldPosition = (world * vec4(position, 1.0)).xyz;
                    gl_Position = worldViewProjection * vec4(position, 1.0);
                }`,
            fragmentSource: `#extension GL_OES_standard_derivatives : enable
                precision highp float;
                varying vec3 worldPosition;
                uniform vec3 cameraPosition;
                uniform float characterHeight;
                void main() {
                    vec2 cell = worldPosition.xz / (characterHeight * 0.12);
                    vec2 width = max(fwidth(cell), vec2(0.00001));
                    vec2 line = abs(fract(cell - 0.5) - 0.5) / width;
                    float grid = 1.0 - min(min(line.x, line.y), 1.0);
                    float distanceFade = exp(-pow(length(worldPosition - cameraPosition) / (characterHeight * 6.5), 2.0));
                    vec3 floorColor = mix(vec3(0.78), vec3(0.60), grid * 0.62);
                    gl_FragColor = vec4(mix(vec3(0.62745), floorColor, distanceFade), 1.0);
                }`
        }, { attributes: ["position"], uniforms: ["world", "worldViewProjection", "cameraPosition", "characterHeight"] });
        this.ground = CreateGround("editor infinite grid floor", {width:200, height:200}, scene);
        this.ground.material = this.grid;
        this.ground.isPickable = false;
        this.sun = new DirectionalLight("editor floor shadow sun", new Vector3(0.65, -1, 0.45), scene);
        this.sun.intensity = 1;
        this.shadowGround = CreateGround("editor ground shadow receiver", {width:12, height:12}, scene);
        this.shadowGround.isPickable = false;
        this.shadowGround.receiveShadows = true;
        this.shadowMaterial = new ShadowOnlyMaterial("editor cast shadow", scene);
        this.shadowMaterial.shadowColor = new Color3(0.2, 0.2, 0.2);
        this.shadowMaterial.alpha = 0.55;
        this.shadowMaterial.activeLight = this.sun;
        this.shadowMaterial.disableDepthWrite = true;
        this.shadowGround.material = this.shadowMaterial;
        // The shadow sun lights only the receiver, preserving authored model colors.
        this.sun.includedOnlyMeshes = [this.shadowGround];
        this.setEnabled(false);
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.enabled || !this.scene.activeCamera) return;
            this.grid.setVector3("cameraPosition", this.scene.activeCamera.globalPosition);
        });
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.scene.clearColor = enabled ? new Color4(160/255,160/255,160/255,1) : new Color4(0,0,0,0);
        this.ground.setEnabled(enabled);
        this.shadowGround.setEnabled(enabled);
        this.sun.setEnabled(enabled);
        if (this.shadows) this.shadows.getShadowMap()!.refreshRate = enabled ? 1 : 0;
    }

    public attach(container: AssetContainer, height: number, floorY: number): void {
        this.detach();
        this.height = height;
        this.grid.setFloat("characterHeight", height);
        this.ground.scaling.setAll(height);
        this.ground.position.y = floorY - height * 0.001;
        this.shadowGround.scaling.setAll(height);
        this.shadowGround.position.y = floorY;
        this.sun.position.set(-height * 2, floorY + height * 3, -height * 1.35);
        this.sun.shadowFrustumSize = height * 4;
        this.sun.shadowMinZ = height * 0.1;
        this.sun.shadowMaxZ = height * 9;
        this.sun.autoUpdateExtends = false;
        this.sun.autoCalcShadowZBounds = false;
        this.shadows = new ShadowGenerator(1024, this.sun);
        this.shadows.usePercentageCloserFiltering = true;
        this.shadows.filteringQuality = ShadowGenerator.QUALITY_HIGH;
        this.shadows.bias = 0.0005;
        this.shadows.normalBias = height * 0.0005;
        this.shadows.enableSoftTransparentShadow = true;
        for (const mesh of container.meshes) {
            if (mesh.getTotalVertices() && mesh.material && !mesh.material.needAlphaBlendingForMesh(mesh)) {
                this.shadows.addShadowCaster(mesh, false);
            }
        }
        this.setEnabled(this.enabled);
    }

    public detach(): void { this.shadows?.dispose(); this.shadows = undefined; }
    public inspect(): Record<string, unknown> {
        return {enabled:this.enabled, sky:"#a0a0a0", floor:"#c7c7c7", gridSpacing:this.height*0.12,
            floorY:this.shadowGround.position.y, shadowCasters:this.shadows?.getShadowMap()?.renderList?.length ?? 0};
    }
    public dispose(): void {
        this.detach(); this.ground.dispose(); this.shadowGround.dispose();
        this.grid.dispose(); this.shadowMaterial.dispose(); this.sun.dispose();
    }
}
