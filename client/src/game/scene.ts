/** Comic Counter Carnival: Babylon owns the fullscreen render surface; the first draft HUD is DOM-based for legibility. */
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
};

export async function createGameScene(engine: Engine, _canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  const camera = new FreeCamera("super-stack-ui-camera", new Vector3(0, 0, -10), scene);
  camera.setTarget(Vector3.Zero());

  return {
    scene,
    dispose: () => scene.dispose(),
  };
}
