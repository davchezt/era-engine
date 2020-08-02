import Tree from './tree.js';
import {
  Camera,
  Controls,
  Environment,
  FreeRoamEntity,
  GameMode,
  Models,
  QualityAdjuster,
  TerrainMap,
  World,
  defaultEraRenderer,
} from '../../build/era.js';
import * as THREE from 'three';

const WIDTH = 20;

/**
 * Game mode for walking around terrain. It's not very exciting.
 */
class LodGameMode extends GameMode {
  constructor() {
    super();
    this.world = null;
    this.character = null;
  }

  /** @override */
  async load() {
    // Create world.
    const renderer = defaultEraRenderer();
    this.world = new World()
      .withPhysics()
      .addRenderer(renderer)
      .addCameraForRenderer(Camera.get().buildPerspectiveCamera(), renderer)
      .withQualityAdjustment(new QualityAdjuster());

    // Create environment.
    const environment = await new Environment().loadFromFile(
      'environment.json'
    );
    this.world.setEnvironment(environment);

    // Create character.
    this.character = new FreeRoamEntity(0.125);
    await this.world.add(this.character);
    this.world.attachCameraToEntity(this.character);
    Controls.get().registerEntity(this.character);
    Controls.get().usePointerLockControls();

    // Load terrain.
    await this.loadTerrain();
    await this.loadTrees();
  }

  /** @override */
  async start() {}

  /**
   * Generates terrain.
   * @async
   */
  async loadTerrain() {
    const terrainMap = new TerrainMap(/* tileSize= */ 64);
    const terrainGeometry = new THREE.PlaneGeometry(WIDTH, WIDTH, 256, 256);
    terrainGeometry.rotateX(-Math.PI / 2);
    await terrainMap.loadFromGeometry(terrainGeometry);
    terrainMap.tiles.forEach((tile) => this.world.add(tile));
  }

  /**
   * Loads trees into the world.
   */
  async loadTrees() {
    await Models.get().loadAllFromFile('trees/trees.json');
    for (let i = 0; i < 50; i++) {
      const tree = new Tree();
      this.world.add(tree);
      tree.setPosition(
        new THREE.Vector3(
          Math.random() * WIDTH - WIDTH / 2,
          0,
          Math.random() * WIDTH - WIDTH / 2
        )
      );
      tree.visualRoot.scale.setScalar(Math.random() + 0.5);
      tree.visualRoot.rotation.y = Math.random() * Math.PI;
    }
  }
}

export default LodGameMode;
