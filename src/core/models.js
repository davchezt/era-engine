/**
 * @author rogerscg / https://github.com/rogerscg
 */
import Animation from './animation.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadJsonFromFile } from './util.js';
import * as THREE from 'three';

let instance = null;

/**
 * Core implementation for loading 3D models for use in-game.
 */
class Models {
  /**
   * Enforces a singleton instance of Models.
   * @returns {Models}
   */
  static get() {
    if (!instance) {
      instance = new Models();
    }
    return instance;
  }

  constructor() {
    // Stores all models. Key is the model name, value is the
    // model mesh.
    this.storage = new Map();
  }

  /**
   * Loads all models described from the provided file path. The file should
   * be a JSON file. Follow the example at /src/data/models.json.
   * @param {string} filePath
   * @async
   */
  async loadAllFromFile(filePath) {
    if (!filePath) {
      return;
    }
    // Load JSON file with all models and options.
    let allModelData;
    try {
      allModelData = await loadJsonFromFile(filePath);
    } catch (e) {
      throw new Error(e);
    }
    // Extract the directory from the file path, use for loading models.
    const directory = filePath.substr(0, filePath.lastIndexOf('/') + 1);
    const promises = new Array();
    for (let name in allModelData) {
      const options = allModelData[name];
      promises.push(this.loadModel(directory, name, options));
    }
    return Promise.all(promises);
  }

  /**
   * Load the model from file and places it into model storage. Uses the glTF
   * file format and loader.
   * @param {string} path
   * @param {Object} options
   * @async
   */
  async loadModel(directory, name, options = {}) {
    // Defaults to GLTF.
    const extension = options.extension ? options.extension : 'gltf';
    const path = `${directory}${name}.${extension}`;
    let root;
    switch (extension) {
      case 'gltf':
        const gltf = await this.loadGltfModel(path);
        root = gltf.scene;
        Animation.get().setAnimations(name, gltf.animations);
        break;
      case 'obj':
        root = await this.loadObjModel(path);
        break;
      case 'fbx':
        root = await this.loadFbxModel(path);
        Animation.get().setAnimations(name, root.animations);
        break;
    }
    // Scale the model based on options.
    if (options.scale) {
      root.scale.setScalar(options.scale);
    }
    if (options.lod) {
      const lod = this.loadLod_(root, options.lod);
      this.storage.set(name, lod);
      return lod;
    }
    // Set the model in storage.
    this.storage.set(name, root);
    return root;
  }

  /**
   * Loads a model from the given file path.
   * @param {string} path
   * @async
   */
  async loadModelWithoutStorage(path) {
    // Defaults to GLTF.
    const extension = path.substr(path.lastIndexOf('.') + 1);
    let root;
    switch (extension) {
      case 'gltf':
        const gltf = await this.loadGltfModel(path);
        root = gltf.scene;
        break;
      case 'obj':
        root = await this.loadObjModel(path);
        break;
      case 'fbx':
        root = await this.loadFbxModel(path);
        break;
    }
    return root;
  }

  /**
   * Loads a GLTF model.
   * @param {string} path
   * @async
   */
  async loadGltfModel(path) {
    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(
        path,
        (gltf) => {
          resolve(gltf);
        },
        () => {},
        (err) => {
          throw new Error(err);
        }
      );
    });
  }

  /**
   * Loads a Obj model.
   * @param {string} path
   * @async
   */
  async loadObjModel(path) {
    let materials = null;
    try {
      materials = await this.loadObjMaterials(path);
    } catch (e) {}
    const root = await this.loadObjGeometry(path, materials);
    return root;
  }

  /**
   *
   * @param {string} path
   * @param {?} materials
   */
  loadObjGeometry(path, materials) {
    return new Promise((resolve) => {
      const objLoader = new OBJLoader();
      if (materials) {
        objLoader.setMaterials(materials);
      }
      objLoader.load(path, resolve);
    });
  }

  /**
   * Loads an obj files respective materials.
   * @param {string} path
   * @async
   */
  loadObjMaterials(path) {
    const mtlLoader = new MTLLoader();
    // Modify .obj path to look for .mtl.
    path = path.slice(0, path.lastIndexOf('.')) + '.mtl';
    return new Promise((resolve, reject) => {
      mtlLoader.load(
        path,
        (materials) => {
          materials.preload();
          resolve(materials);
        },
        () => {},
        () => reject()
      );
    });
  }

  /**
   * Loads a FBX model.
   * @param {string} path
   * @async
   */
  async loadFbxModel(path) {
    const loader = new FBXLoader();
    return new Promise((resolve) => {
      loader.load(
        path,
        (object) => {
          resolve(object);
        },
        () => {},
        (err) => console.error(err)
      );
    });
  }

  /**
   * Creates a clone of a model from storage.
   * @param {string} name
   * @return {THREE.Object3D}
   */
  createModel(name) {
    if (!this.storage.has(name)) {
      return null;
    }
    const original = this.storage.get(name);
    const clone = SkeletonUtils.clone(original);
    return clone;
  }

  /**
   * Loads a Level of Detail wrapper object for the given model. This works
   * under the assumption that the user has provided groups of meshes, each with
   * a suffix "_LOD{n}".
   * @param {THREE.Object3D} root
   * @param {Array<number>} levels
   * @return {THREE.LOD}
   * @private
   */
  loadLod_(root, levels) {
    // Ensure the root contains a list of children.
    if (!root || !root.children || root.children.length != levels.length) {
      console.error(
        'Root children and levels do not match:',
        root.children,
        levels
      );
    }
    const lod = new THREE.LOD();
    levels.forEach((levelThreshold, index) => {
      let lodObject = null;
      root.children.forEach((child) => {
        if (new RegExp(`.*LOD${index}`).test(child.name)) {
          lodObject = child;
        }
      });
      if (!lodObject) {
        return console.error('No LOD mesh for level', index);
      }
      lod.addLevel(lodObject, levelThreshold);
    });
    return lod;
  }
}

export default Models;
