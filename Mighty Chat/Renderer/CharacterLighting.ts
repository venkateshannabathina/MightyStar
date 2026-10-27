import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { HDRFiltering } from "@babylonjs/core/Materials/Textures/Filtering/hdrFiltering";
import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";

export interface CharacterLightingProfile {
    readonly pbrCharacter: boolean;
    readonly appearanceKey: string;
    readonly height: number;
}
export interface CharacterLightingOptions {
    readonly environmentUrl?: string;
    readonly selfShadows?: boolean;
}
interface MaterialState {
    readonly material: PBRMaterial;
    readonly imageProcessing: ImageProcessingConfiguration;
    readonly environmentIntensity: number;
    readonly specularIntensity: number;
    readonly roughness: number | null;
    readonly specularAA: boolean;
    readonly radianceOverAlpha: boolean;
    readonly specularOverAlpha: boolean;
}

/** Lighting stays independent of character playback and keeps the canvas clear. */
export class CharacterLighting {
    private readonly fill: HemisphericLight;
    private readonly key: DirectionalLight;
    private readonly rim: DirectionalLight;
    private readonly imageProcessing = new ImageProcessingConfiguration();
    private readonly originalEnvironment: BaseTexture | null;
    private readonly environmentUrl: string;
    private readonly selfShadows: boolean;
    private environment: HDRCubeTexture | undefined;
    private environmentReady = false;
    private environmentFailed = false;
    private environmentError = "";
    private prefiltered = false;
    private disposed = false;
    private profile: "studio-pbr" | "authored-toon" | "none" = "none";
    private appearanceKey = "";
    private shadows: ShadowGenerator | undefined;
    private readonly materials: MaterialState[] = [];
    private readonly receivers = new Map<AbstractMesh, boolean>();
    private casterNames: string[] = [];

    public constructor(private readonly scene: Scene, options: CharacterLightingOptions = {}) {
        this.originalEnvironment = scene.environmentTexture;
        this.environmentUrl = options.environmentUrl ?? (typeof document === "undefined" ? "/Companion/assets/studio-neutral.hdr" : new URL("assets/studio-neutral.hdr", document.baseURI).href);
        this.selfShadows = options.selfShadows ?? true;
        this.fill = new HemisphericLight("character soft light", new Vector3(0, 1, -0.5), scene);
        this.key = new DirectionalLight("character key light", new Vector3(0.4, -0.8, 1), scene);
        this.rim = new DirectionalLight("character studio rim", new Vector3(-0.6, -0.35, -1), scene);
        this.imageProcessing.toneMappingEnabled = true;
        this.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
        this.imageProcessing.exposure = 1.55;
        this.imageProcessing.contrast = 1;
        this.imageProcessing.applyByPostProcess = false;
        this.restoreToonLights();
    }

    private restoreToonLights(): void {
        // These are the companion's original light values. MMD materials and
        // scene image processing retain their authored rendering behavior.
        this.fill.intensity = 0.75;
        this.fill.diffuse = Color3.White();
        this.fill.specular = Color3.Black();
        this.fill.groundColor = new Color3(0.55, 0.52, 0.48);
        this.key.intensity = 0.65;
        this.key.direction.set(0.4, -0.8, 1);
        this.key.diffuse = Color3.White();
        this.key.specular = Color3.White();
        this.rim.setEnabled(false);
    }

    private ensureEnvironment(): void {
        if (this.environment || this.disposed) return;
        const caps = this.scene.getEngine().getCaps();
        const filterable = caps.textureLOD && (caps.textureHalfFloatRender || caps.textureFloatRender);
        const loaded = (): void => {
            const texture = this.environment;
            if (!texture || this.disposed) return;
            if (!filterable) {
                this.environmentReady = true;
                return;
            }
            // Broad studio panels need fewer samples than a photographic map.
            // Explicit filtering also lets failed GPU work fall back cleanly.
            const filtering = new HDRFiltering(this.scene.getEngine(), { quality: 256 });
            void filtering.prefilter(texture).then(() => {
                if (!this.disposed) { this.prefiltered = true; this.environmentReady = true; }
            }).catch(error => {
                if (!this.disposed) {
                    this.environmentReady = true;
                    this.environmentFailed = true;
                    this.environmentError = String(error);
                }
            });
        };
        this.environment = new HDRCubeTexture(this.environmentUrl, this.scene, 64, false, true, false, false, loaded, (message, error) => {
            if (this.disposed) return;
            this.environmentFailed = true;
            this.environmentError = message ?? String(error ?? "Studio environment could not load");
            if (this.profile === "studio-pbr") this.scene.environmentTexture = this.originalEnvironment;
        });
        this.environment.name = "Mighty Star local studio environment";
        this.environment.isBlocking = false;
    }

    public attach(container: AssetContainer, options: CharacterLightingProfile): void {
        if (this.disposed) return;
        this.detach();
        this.appearanceKey = options.appearanceKey;
        if (!options.pbrCharacter) {
            this.profile = "authored-toon";
            return;
        }
        this.profile = "studio-pbr";
        this.ensureEnvironment();
        if (!this.environmentFailed && this.environment) this.scene.environmentTexture = this.environment;
        this.fill.intensity = 0.90;
        this.fill.groundColor = new Color3(0.35, 0.36, 0.38);
        this.key.intensity = 0.9;
        this.key.direction.set(0.35, -0.7, 1);
        this.key.diffuse = new Color3(1, 0.98, 0.96);
        this.rim.diffuse = new Color3(0.92, 0.96, 1);
        this.rim.specular = new Color3(0.65, 0.68, 0.72);
        this.rim.intensity = 0.22;
        this.rim.setEnabled(true);
        for (const material of container.materials) {
            if (!(material instanceof PBRMaterial)) continue;
            this.materials.push({
                material, imageProcessing: material.imageProcessingConfiguration,
                environmentIntensity: material.environmentIntensity, specularIntensity: material.specularIntensity,
                roughness: material.roughness, specularAA: material.enableSpecularAntiAliasing,
                radianceOverAlpha: material.useRadianceOverAlpha, specularOverAlpha: material.useSpecularOverAlpha
            });
            material.imageProcessingConfiguration = this.imageProcessing;
            material.enableSpecularAntiAliasing = true;
            material.environmentIntensity = 0.65;
            const hailey = /\/hailey\//i.test(options.appearanceKey) && /^Hailey\s*\|/i.test(material.name);
            if (!hailey) continue;
            // Preserve embedded ORM maps, normal direction, and transparency.
            if (/skin/i.test(material.name)) {
                material.environmentIntensity = 0.55;
                material.specularIntensity = Math.min(material.specularIntensity, 0.7);
            } else if (/suit/i.test(material.name)) material.environmentIntensity = 0.55;
            else if (/hair/i.test(material.name)) {
                material.environmentIntensity = 0.3;
                material.roughness = 0.48;
                material.useRadianceOverAlpha = false;
                material.useSpecularOverAlpha = false;
            } else if (/eye|headset|tearline/i.test(material.name)) material.environmentIntensity = 0.7;
        }
        this.configureShadows(container, Math.max(0.1, options.height));
    }

    private configureShadows(container: AssetContainer, height: number): void {
        const caps = this.scene.getEngine().getCaps();
        if (!this.selfShadows || !caps.depthTextureExtension) return;
        const direction = this.key.direction.normalizeToNew();
        this.key.position.copyFrom(new Vector3(0, height * 0.5, 0).subtract(direction.scale(height * 2)));
        this.key.shadowFrustumSize = height * 1.8;
        this.key.shadowMinZ = height * 0.5;
        this.key.shadowMaxZ = height * 4;
        this.key.autoUpdateExtends = false;
        this.key.autoCalcShadowZBounds = false;
        this.shadows = new ShadowGenerator(512, this.key);
        this.shadows.usePercentageCloserFiltering = true;
        this.shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
        this.shadows.bias = 0.001;
        this.shadows.normalBias = height * 0.001;
        this.shadows.setDarkness(0.82);
        this.shadows.transparencyShadow = false;
        for (const mesh of container.meshes) {
            const material = mesh.material;
            // Fine BLEND hair strands, tearline and eye moisture stay out of the
            // depth map. No alpha cutoff or depth-write changes are introduced.
            if (!mesh.getTotalVertices() || !material || material.needAlphaBlendingForMesh(mesh)) continue;
            this.receivers.set(mesh, mesh.receiveShadows);
            mesh.receiveShadows = true;
            this.shadows.addShadowCaster(mesh, false);
            this.casterNames.push(mesh.name);
        }
    }

    public inspect(): Record<string, unknown> {
        return {
            profile: this.profile, appearanceKey: this.appearanceKey,
            environmentReady: this.environmentReady, environmentFailed: this.environmentFailed,
            environmentError: this.environmentError, environmentUrl: this.environmentUrl,
            environmentSize: 64, prefiltered: this.prefiltered,
            toneMapping: this.profile === "studio-pbr" ? "ACES" : "none",
            exposure: this.profile === "studio-pbr" ? this.imageProcessing.exposure : this.scene.imageProcessingConfiguration.exposure,
            shadowMapSize: this.shadows ? 512 : 0, shadowOpacity: this.shadows ? 0.18 : 0,
            shadowCasterNames: this.casterNames.slice(), transparentCanvas: this.scene.clearColor.a === 0,
            lights: { fill: this.fill.intensity, key: this.key.intensity, rim: this.rim.isEnabled() ? this.rim.intensity : 0 },
            tunedMaterials: this.materials.map(({ material }) => ({
                name: material.name, environmentIntensity: material.environmentIntensity,
                specularIntensity: material.specularIntensity, roughness: material.roughness,
                metallic: material.metallic, alpha: material.alpha,
                radianceOverAlpha: material.useRadianceOverAlpha, specularOverAlpha: material.useSpecularOverAlpha
            }))
        };
    }

    public detach(): void {
        this.shadows?.dispose();
        this.shadows = undefined;
        this.receivers.forEach((receive, mesh) => { if (!mesh.isDisposed()) mesh.receiveShadows = receive; });
        this.receivers.clear();
        this.casterNames = [];
        for (const state of this.materials) {
            const material = state.material;
            material.imageProcessingConfiguration = state.imageProcessing;
            material.environmentIntensity = state.environmentIntensity;
            material.specularIntensity = state.specularIntensity;
            material.roughness = state.roughness;
            material.enableSpecularAntiAliasing = state.specularAA;
            material.useRadianceOverAlpha = state.radianceOverAlpha;
            material.useSpecularOverAlpha = state.specularOverAlpha;
        }
        this.materials.length = 0;
        this.scene.environmentTexture = this.originalEnvironment;
        this.restoreToonLights();
        this.profile = "none";
        this.appearanceKey = "";
    }

    public dispose(): void {
        if (this.disposed) return;
        this.detach();
        this.disposed = true;
        this.environment?.dispose();
        this.environment = undefined;
        this.fill.dispose(); this.key.dispose(); this.rim.dispose();
    }
}
