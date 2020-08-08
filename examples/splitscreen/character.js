import { Character as EraCharacter } from '../../build/era.js';

const MAX_CAMERA_Z = Math.PI / 4;
const MIN_CAMERA_Z = -Math.PI / 24;

/**
 * A shooter character.
 */
class Character extends EraCharacter {
  constructor() {
    super();
    this.modelName = 'robot';
    this.animations.set('idle', 'Character|Idling');
    this.animations.set('walking', 'Character|Walking');
    this.animations.set('running', 'Character|Running');
    this.animations.set('jumping', 'Character|JumpUp');
    this.animations.set('falling', 'Character|Falling');
    this.animations.set('landing', 'Character|Landing');
  }

  /** @override */
  update() {
    super.update();
    this.updateCamera();
  }

  /** @override */
  jump() {
    if (super.jump()) {
      this.physicsBody.velocity.y = 3.5;
    }
  }

  /**
   * Updates the camera rotation.
   */
  updateCamera() {
    // Update from controller.
    if (this.getActionValue(this.bindings.LOOK_X)) {
      this.cameraArm.rotation.y -=
        0.1 * this.getActionValue(this.bindings.LOOK_X);
    }
    if (this.getActionValue(this.bindings.LOOK_Y)) {
      this.cameraArm.rotation.z +=
        0.02 * this.getActionValue(this.bindings.LOOK_Y);
    }
    // Update from mouse movement.
    this.cameraArm.rotation.y -= 0.01 * this.getMouseMovement().x;
    this.cameraArm.rotation.z += 0.01 * this.getMouseMovement().y;

    // Clamp.
    this.cameraArm.rotation.z = Math.min(
      MAX_CAMERA_Z,
      Math.max(MIN_CAMERA_Z, this.cameraArm.rotation.z)
    );
  }
}

export default Character;
