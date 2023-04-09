import * as THREE from 'three';
import './style.css';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Mesh } from 'three';
import { generateTexture, normalize, randomNumberBetween } from './helpers';
import { levelColor } from './constants';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let group: THREE.Group;

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

  const skyscrapers: any[] = [];

  // SYK SCRAPERS
  data.weeks.forEach((week: any, weekIndex: any) => {
    week.days.forEach((day: any, dayIndex: any) => {
      if (day.count !== 0) {
        const position = new THREE.Vector3(
          (weekIndex - (data.weeks.length - 1) / 2) * sizes.width,
          ((day.count * sizes.max) / 2) * sizes.width,
          dayIndex * sizes.width
        );

        // texture.repeat.set(1, Math.round(day.count * sizes.max));
        const geometry = new THREE.BoxGeometry(
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
            clipShadows: true,
          })
        );
        skyscraper.receiveShadow = true;
        skyscraper.castShadow = true;
        skyscraper.position.copy(position);

        const roof = new THREE.Mesh(
          new THREE.PlaneGeometry(sizes.width, sizes.width),
          new THREE.MeshPhongMaterial({
            color: new THREE.Color(levelColor[day.count]),
          })
        );
        roof.receiveShadow = true;
        roof.rotateX(-Math.PI / 2);
        roof.position.copy(
          new THREE.Vector3(
            0,
            (day.count * sizes.max * sizes.width) / 2 + 0.001,
            0
          )
        );
        skyscraper.add(roof);

        skyscrapers.push({
          skyscraper,
        });

        // skyscraper.visible = true;

        group.add(skyscraper);
        group.receiveShadow = true;
        group.castShadow = true;
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
  ground.receiveShadow = true;
  ground.castShadow = true;
  group.add(ground);

  new FontLoader().load(
    'https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json',
    (font) => {
      const textGeo = new TextGeometry(`@${username}`, {
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
  group.position.set(0, sizes.width, 0);
  scene.add(group);
}

function init() {
  window.addEventListener('resize', onWindowResize);

  scene = new THREE.Scene();

  // CAMERA
  camera = new THREE.PerspectiveCamera(
    10,
    window.innerWidth / window.innerHeight,
    30,
    1000
  );
  camera.position.set(
    -0.7197292629569743,
    437.86526533459295,
    23.64723494574007
  );

  // HELPER
  // scene.add(new THREE.GridHelper(40, 40));

  // RENDERER
  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // LIGHT
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  hemiLight.color.setHSL(0.6, 1, 0.6);
  hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.2);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 2, 3);
  dirLight.lookAt(0, 0, 0);
  dirLight.position.multiplyScalar(10);

  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 4048;
  dirLight.shadow.mapSize.height = 4048;

  const d = 40;

  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;

  dirLight.shadow.camera.far = 500;
  dirLight.shadow.bias = -0.0001;

  scene.add(dirLight);

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
    fetch(`${import.meta.env.VITE_API_URL}api/graph?name=${username}`)
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
      .catch(toggleLoader);
  } else {
    toggleLoader();
  }
};

(function () {
  const params = new URLSearchParams(window.location.search);

  loadGraph(params.get('name'));

  const usernameInput: HTMLInputElement | null =
    document.querySelector('#github-username');
  const loadButton = document.querySelector('#load-github-graph');

  loadButton?.addEventListener('click', () => {
    if (!usernameInput?.value) {
      alert('Please enter a username');
    } else {
      loadGraph(usernameInput?.value);
    }
  });
})();
