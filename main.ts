import * as THREE from 'three';
import './style.css';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader.js';

import { Mesh } from 'three';
import {
  exportSTL,
  generateTexture,
  normalize,
  randomNumberBetween,
} from './helpers';
import { levelColor } from './constants';
// const API_URL = 'https://github-graph-3d.vercel.app/';
const API_URL = 'http://localhost:3000/';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let group: THREE.Group;
let hdrCubeMap: any;
let hdrCubeRenderTarget: any;

let skyScapersMesh: THREE.Mesh<
  THREE.BufferGeometry,
  THREE.MeshStandardMaterial
>;

const textures: THREE.Texture[] = new Array(7)
  .fill(null)
  .map(() => new THREE.Texture(generateTexture()));

function generate3dGraph(data: any, username: string) {
  if (group) {
    scene.remove(group);
  }

  group = new THREE.Group();

  const sizes = {
    width: 1,
    max: normalize(10, data.highest, data.lowest),
  };

  const skyscrapers: THREE.Mesh<
    THREE.BoxBufferGeometry,
    THREE.MeshPhongMaterial
  >[] = [];

  // SYK SCRAPERS
  data.weeks.forEach((week: any, weekIndex: number) => {
    week.days.forEach((day: any, dayIndex: number) => {
      if (day.count) {
        const position = new THREE.Vector3(
          (weekIndex - (data.weeks.length - 1) / 2) * sizes.width,
          ((day.count * sizes.max) / 2) * sizes.width,
          dayIndex * sizes.width
        );

        // texture.repeat.set(1, Math.round(day.count * sizes.max));
        const geometry = new THREE.BoxBufferGeometry(
          sizes.width,
          day.count * sizes.max * sizes.width,
          sizes.width
        );

        const texture = textures[randomNumberBetween(0, 6)];
        texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
        texture.offset.set(0, 0);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;

        const value = randomNumberBetween(50, 150) / 255;
        const color = new THREE.Color().setRGB(value, value, value);

        const skyscraper = new THREE.Mesh(
          geometry,
          new THREE.MeshPhongMaterial({
            color,
            specular: 0xffffff,
            emissive: color,
            emissiveIntensity: 0.6,
            shininess: 10,
            map: texture,
            flatShading: true,
          })
        );
        skyscraper.position.copy(position);

        const roof = new THREE.Mesh(
          new THREE.PlaneGeometry(sizes.width, sizes.width),
          new THREE.MeshPhongMaterial({
            color: levelColor[day.level],
          })
        );
        roof.rotateX(-Math.PI / 2);
        roof.position.copy(
          new THREE.Vector3(
            0,
            (day.count * sizes.max * sizes.width) / 2 + 0.001,
            0
          )
        );
        skyscraper.add(roof);

        skyscraper.updateMatrix();

        skyscrapers.push(skyscraper);
      }
    });
  });

  // GROUND
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  groundMat.color.setHSL(0.095, 1, 0.75);
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(
      data.weeks.length * sizes.width,
      sizes.width,
      7 * sizes.width
    ),
    groundMat
  );

  new THREE.FontLoader().load(
    'https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json',
    (font) => {
      const textGeo = new THREE.TextGeometry(`@${username}`, {
        font,
        size: sizes.width,
        height: 0.1,
      });

      textGeo.computeBoundingBox();

      const fontMesh = new Mesh(
        textGeo,
        new THREE.MeshBasicMaterial({
          color: 0x777777,
          transparent: true,
          opacity: 1,
          side: THREE.DoubleSide,
        })
      );
      fontMesh.rotateX(-Math.PI / 2);
      fontMesh.position.set(
        (-data.weeks.length * sizes.width) / 2,
        -1,
        7 * sizes.width + sizes.width
      );
      group.add(fontMesh);
    }
  );

  ground.position.set(0, -sizes.width / 2, sizes.width * 3);
  ground.updateMatrix();

  skyScapersMesh = new THREE.Mesh(
    BufferGeometryUtils.mergeBufferGeometries([
      ...skyscrapers.map((skyscraper) =>
        skyscraper.geometry.clone().applyMatrix4(skyscraper.matrix)
      ),
      ground.geometry.clone().applyMatrix4(ground.matrix),
    ]),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.4,
    })
  );

  scene.add(skyScapersMesh);
}

function init() {
  window.addEventListener('resize', onWindowResize);

  scene = new THREE.Scene();

  // CAMERA
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 0, 120);
  // camera.position.set(
  //   -0.7197292629569743,
  //   437.86526533459295,
  //   23.64723494574007
  // );

  // HELPER
  // scene.add(new THREE.GridHelper(40, 40));

  // RENDERER
  renderer = new THREE.WebGLRenderer({ alpha: true });

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();
  pmremGenerator.fromScene(scene);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // HDR

  THREE.DefaultLoadingManager.onLoad = function () {
    pmremGenerator.dispose();
  };

  hdrCubeMap = new HDRCubeTextureLoader()
    .setPath('http://localhost:5000/static/')
    .setDataType(THREE.UnsignedByteType)
    .load(
      ['px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr'],
      function () {
        hdrCubeRenderTarget = pmremGenerator.fromCubemap(hdrCubeMap);

        hdrCubeMap.magFilter = THREE.LinearFilter;

        hdrCubeMap.needsUpdate = true;
      }
    );

  // LIGHT

  // scene.add(new THREE.AmbientLight(0x000000, 1));

  // const light1 = new THREE.PointLight(0xffffff, 1, 0);
  // light1.position.set(0, 20, 0);
  // scene.add(light1);

  // const light2 = new THREE.PointLight(0xffffff, 1, 0);
  // light2.position.set(10, 20, 10);
  // scene.add(light2);

  // const light3 = new THREE.PointLight(0xffffff, 1, 0);
  // light3.position.set(-10, -20, -10);
  // scene.add(light3);

  // const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  // hemiLight.color.setHSL(0.6, 1, 0.6);
  // hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  // hemiLight.position.set(0, 50, 0);
  // scene.add(hemiLight);

  // const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  // // dirLight.color.setHSL(0.1, 1, 0.95);
  // dirLight.position.set(-1, 2, 3);
  // dirLight.lookAt(0, 0, 0);
  // dirLight.position.multiplyScalar(10);
  // scene.add(dirLight);

  // dirLight.castShadow = true;

  // dirLight.shadow.mapSize.width = 1048;
  // dirLight.shadow.mapSize.height = 1048;

  // const d = 10;

  // dirLight.shadow.camera.left = -d;
  // dirLight.shadow.camera.right = d;
  // dirLight.shadow.camera.top = d;
  // dirLight.shadow.camera.bottom = -d;

  // dirLight.shadow.camera.far = 2500;
  // dirLight.shadow.bias = -0.0001;

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;
  controls.target.set(0, 0, 0);
  controls.update();

  return scene;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();

  let renderTarget;
  // let cubeMap;

  renderTarget = hdrCubeRenderTarget;
  // cubeMap = hdrCubeMap;

  const newEnvMap = renderTarget ? renderTarget.texture : null;

  if (newEnvMap && newEnvMap !== skyScapersMesh.material.envMap) {
    skyScapersMesh.material.envMap = newEnvMap;
    skyScapersMesh.material.needsUpdate = true;
  }

  // scene.background = cubeMap;

  renderer.toneMappingExposure = 1;

  renderer.render(scene, camera);
}

const toggleLoader = () => {
  const loader: HTMLDivElement = document.querySelector('#loader')!;
  loader.style.display =
    loader.style.display === 'none' || !loader.style.display ? 'flex' : 'none';
};

// FORM
const loadGraph = (username: string | null) => {
  toggleLoader();
  if (username) {
    if (renderer) {
      renderer.clear();
    }
    fetch(`${API_URL}api/graph?name=${username}`)
      .then(async (res) => {
        const data = await res.json();

        if (data && !data.error) {
          if (!renderer) {
            init();
            animate();
          }
          generate3dGraph(data, username);
        }

        toggleLoader();
      })
      .catch((e) => {
        console.log(e);
        // alert('Could not gather github information.');
        toggleLoader();
      });
  } else {
    toggleLoader();
  }
};

(function () {
  const params = new URLSearchParams(window.location.search);
  let name = params.get('name') || 'ph1p';

  loadGraph(name);

  const usernameInput: HTMLInputElement | null = document.querySelector(
    '#github-username'
  );
  const loadButton = document.querySelector('#load-github-graph');
  const stlExportButton = document.querySelector('#stl-export');

  loadButton?.addEventListener('click', () => {
    if (!usernameInput?.value) {
      alert('Please enter a username');
    } else {
      name = usernameInput?.value;
      loadGraph(name);
    }
  });

  stlExportButton?.addEventListener('click', () =>
    exportSTL(skyScapersMesh, name)
  );
})();
