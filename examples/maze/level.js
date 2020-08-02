import Objective from './objective.js';
import { Entity, MaterialManager, Models } from '../../build/era.js';

/**
 * A maze level.
 */
class Level extends Entity {
  /**
   * @param {string} levelName
   */
  constructor(levelName) {
    super();
    this.modelName = levelName;
    this.autogeneratePhysics = true;
    this.objective = null;
  }

  /** @override */
  generatePhysicsBody() {
    const body = super.generatePhysicsBody();
    body.material = MaterialManager.get().createPhysicalMaterial('level');
    MaterialManager.get().createContactMaterial('character', 'level', {
      friction: 0,
      contactEquationStiffness: 1e8,
    });
    return body;
  }

  /** @override */
  positionCamera(camera) {
    this.cameraArm.add(camera);
    camera.position.x = 20;
    this.cameraArm.rotation.z = Math.PI / 4;
    this.cameraArm.rotation.y = Math.PI / 2;
    camera.lookAt(this.visualRoot.position);
  }

  /** @override */
  async build() {
    await super.build();
    await this.loadObjective();
    return this;
  }

  /** @override */
  destroy() {
    super.destroy();
    this.objective.destroy();
  }

  /**
   * Loads the objects necessary for the level.
   * @async
   */
  async load() {
    // Load maze model.
    await Models.get().loadModel('levels/', this.modelName);
  }

  /**
   * Loads the objective entity into the level.
   */
  async loadObjective() {
    this.objective = new Objective().withPhysics();
    // Register listener for when the objective has been reached.
    this.objective.addEventListener('completed', () => this.complete());
    const objectivePoint = this.visualRoot.getObjectByName('Objective');
    if (!objectivePoint) {
      return console.error('No objective point found.');
    }
    await this.getWorld().add(this.objective);
    this.objective.setPosition(objectivePoint.position);
  }

  /**
   * Gets the spawn point for the level.
   * @returns {THREE.Object3D}
   */
  getSpawnPoint() {
    return this.visualRoot.getObjectByName('Spawn');
  }

  /**
   * Marks the level as complete, firing an event upwards to notify observers.
   */
  complete() {
    this.dispatchEvent('complete');
  }
}

export default Level;
