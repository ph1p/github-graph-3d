import * as THREE from 'three';
import './style.css';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Mesh } from 'three';

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let group: THREE.Group;

const levelColor: Record<number, string> = {
  0: '#ebedf0',
  1: '#c6e48b',
  2: '#7bc96f',
  3: '#239a3b',
  4: '#196127',
};

const normalize = (val: any, max: any, min: any) => (val - min) / (max - min);

const randomNumberBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

// thanks to http://learningthreejs.com/blog/2013/08/02/how-to-do-a-procedural-city-in-100lines/
const generateTexture = () => {
  const width = 32;
  const height = 64;

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d')!;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  const row = randomNumberBetween(1, 3);

  for (let y = 0; y < height; y += row) {
    for (let x = 0; x < width; x += 2) {
      const value = Math.floor(Math.random() * 64);

      if (Math.floor(Math.random() * 1000) % 10 === 0) {
        context.fillStyle =
          'rgb(' + [255, 255, (Math.random() * 255) | 0].join(',') + ')';
      } else {
        context.fillStyle = 'rgb(' + [value, value, value].join(',') + ')';
      }

      context.fillRect(x, y, row !== 2 ? 1 : 2, 1);
    }
  }

  const width2 = 512,
    height2 = 1024;
  const canvas2 = new OffscreenCanvas(width2, height2);
  const context2 = canvas2.getContext('2d')!;

  context2.imageSmoothingEnabled = false;
  context2.drawImage(canvas, 0, 0, width2, height2);

  return (canvas2 as unknown) as HTMLCanvasElement;
};

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
      if (day.count !== '0') {
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

        const texture = new THREE.Texture(generateTexture());
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set(0, 0);
        texture.repeat.set(
          1,
          day.count *
            sizes.max *
            sizes.width *
            (Math.random() * (0.4 - 0.6) + 0.6)
        );
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
        skyscraper.receiveShadow = true;
        skyscraper.castShadow = true;
        skyscraper.position.copy(position);

        const roof = new THREE.Mesh(
          new THREE.PlaneGeometry(sizes.width, sizes.width),
          new THREE.MeshPhongMaterial({
            color: levelColor[day.level],
            side: THREE.DoubleSide,
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

        const wireframe = new THREE.LineSegments(
          new THREE.WireframeGeometry(geometry),
          new THREE.LineBasicMaterial({
            color: 0xf00000,
            linewidth: 5,
          })
        );

        skyscrapers.push({
          skyscraper,
          wireframe,
        });

        skyscraper.visible = true;
        wireframe.visible = false;

        wireframe.position.copy(position);

        group.add(skyscraper, wireframe);
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
  group.add(ground);
  ground.position.set(0, -sizes.width / 2, sizes.width * 3);
  ground.receiveShadow = true;

  group.position.set(0, sizes.width, 0);

  new THREE.FontLoader().load(
    'https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json',
    (font) => {
      const textGeo = new THREE.TextGeometry(`@${username}`, {
        font,
        size: sizes.width,
        height: sizes.width / 4,
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

  scene.add(group);
}

async function init() {
  window.addEventListener('resize', onWindowResize);

  scene = new THREE.Scene();

  // CAMERA
  camera = new THREE.PerspectiveCamera(
    10,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(
    -0.7197292629569743,
    437.86526533459295,
    23.64723494574007
  );

  // HELPER
  // scene.add(new THREE.GridHelper(40, 40));

  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff);
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

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.1);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 2, 3);
  dirLight.lookAt(0, 0, 0);
  dirLight.position.multiplyScalar(10);
  scene.add(dirLight);

  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 1048;
  dirLight.shadow.mapSize.height = 1048;

  const d = 10;

  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;

  dirLight.shadow.camera.far = 2500;
  dirLight.shadow.bias = -0.0001;

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;
  controls.target.set(0, 0, 0);
  controls.update();
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

const loadGraph = (username: string | null) => {
  toggleLoader();
  if (username) {
    if (renderer) {
      renderer.clear();
    }
    fetch(`https://github-graph-3d.vercel.app/api/graph?name=${username}`)
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

const params = new URLSearchParams(window.location.search);

loadGraph(params.get('name'));

const usernameInput: HTMLInputElement | null = document.querySelector(
  '#github-username'
);
const loadButton = document.querySelector('#load-github-graph');

loadButton?.addEventListener('click', () => {
  if (!usernameInput?.value) {
    alert('Please enter a username');
  } else {
    loadGraph(usernameInput?.value);
  }
});
