import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass";

export class RenderPipeline {
  private effectComposer: EffectComposer;
  private renderPass: RenderPass;
  private hoverOutlinePass: OutlinePass;
  private selectedOutlinePass: OutlinePass;
  private renderer: THREE.WebGLRenderer;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1;

    // Add canvas to dom
    const canvas = this.canvas;
    document.body.appendChild(canvas);

    window.addEventListener("resize", this.onCanvasResize);
    this.onCanvasResize();

    // Setup pipeline
    this.effectComposer = new EffectComposer(this.renderer);
    this.effectComposer.renderToScreen = true;

    // Initial render acts as input for next pass
    this.renderPass = new RenderPass(scene, camera);
    this.effectComposer.addPass(this.renderPass);

    // Hover outline pass
    this.hoverOutlinePass = new OutlinePass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      scene,
      camera
    );
    this.hoverOutlinePass.edgeStrength = 10;
    this.hoverOutlinePass.edgeThickness = 0.25;
    this.hoverOutlinePass.edgeGlow = 0;
    this.hoverOutlinePass.visibleEdgeColor.set("#ffffff");
    this.hoverOutlinePass.hiddenEdgeColor.set("#ffffff");
    this.effectComposer.addPass(this.hoverOutlinePass);

    // Selected outline pass
    this.selectedOutlinePass = new OutlinePass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      scene,
      camera
    );
    this.selectedOutlinePass.edgeStrength = 12;
    this.selectedOutlinePass.edgeThickness = 0.25;
    this.selectedOutlinePass.edgeGlow = 0.6;
    this.selectedOutlinePass.visibleEdgeColor.set("#f3831b");
    this.selectedOutlinePass.hiddenEdgeColor.set("#f3831b");
    this.effectComposer.addPass(this.selectedOutlinePass);

    this.effectComposer.addPass(new OutputPass());
  }

  get canvas() {
    return this.renderer.domElement;
  }

  render(dt: number) {
    this.effectComposer.render(dt);
  }

  hoverOutlineObject(object: THREE.Object3D) {
    this.hoverOutlinePass.selectedObjects.push(object);
  }

  clearHoverOutlines() {
    this.hoverOutlinePass.selectedObjects = [];
  }

  removeHoverOutlineObject(object: THREE.Object3D) {
    this.hoverOutlinePass.selectedObjects =
      this.hoverOutlinePass.selectedObjects.filter((obj) => obj !== object);
  }

  selectOutlineObject(object: THREE.Object3D) {
    this.selectedOutlinePass.selectedObjects.push(object);
  }

  removeSelectOutlineObject(object: THREE.Object3D) {
    this.selectedOutlinePass.selectedObjects =
      this.selectedOutlinePass.selectedObjects.filter((obj) => obj !== object);
  }

  private onCanvasResize = () => {
    this.renderer.setSize(
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      false
    );

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;

    this.camera.updateProjectionMatrix();
  };
}
