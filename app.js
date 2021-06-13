'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

import {
  GUI
} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

function main() {
  // create WebGLRenderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // create camera
  const fov = 75;
  const aspect = 2;
  const near = 0.1;
  const far = 25;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0.5, 1, 0.5);

  // create OrbitControls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0); // OrbitControls에 의해 카메라를 움직일 때 카메라의 시선을 원점으로 고정
  controls.update(); // OrbitControls의 속성값을 바꿔줬으면 업데이트 메서드를 호출해줘야 함.

  // create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white'); // Color 객체를 만들어서 background에 할당함.

  // 위치값을 받아 DirectionalLight(직사광)을 생성하는 함수
  function addLight(x, y, z) {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);
    scene.add(light);
  }
  addLight(-1, 2, 4);
  addLight(1, -1, -2); // 옆면에서도 빛을 쏴줘서 잘 보일 수 있게 조명을 하나 더 생성함.

  // create planeGeometry
  const planeWidth = 1;
  const planeHeight = 1;
  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

  // create TextureLoader
  const loader = new THREE.TextureLoader();

  // 이미지 텍스처의 url을 입력받아 평면 메쉬를 생성하는 함수
  function makeInstance(geometry, color, rotY, url) {
    const texture = loader.load(url, animate);

    /**
     * 예제2 처럼 전부 불투명한 텍스처들은 투명하게 비쳐지게 하려면 메쉬를 반으로 쪼개야 했음.
     * 
     * 그런데, 부분적으로 투명한 텍스처들(나뭇잎, 잔디 등 경계가 분명한 텍스처들)은
     * alphaTest값을 이용해서 뒷면을 보이게 할 수 있음.
     * 
     * 이거는 머티리얼을 생성할 때 속성값으로 지정해 주는건데, 해당 값보다 투명도가 낮은 픽셀들은 아예 렌더링하지 않도록 하는거임.
     * 나무, 잔디처럼 배경이 투명한 png 텍스처들은 배경 부분이 투명도가 0이기 때문에 alphaTest를 0.5정도로 지정해주면
     * 배경부분이 그려지지 않음으로써, 교차된 평면 메쉬의 뒷부분이 잘 보이게 될거임.
     * 
     * 얘는 알파테스트값을 이용하기 때문에 예제2 처럼 메쉬를 반으로 쪼개서 생성해주는 코드를 작성할 필요가 없음.
     */
    const material = new THREE.MeshPhongMaterial({
      // 참고로 이렇게 texture를 할당하면서 color를 전달하면, texture 안에서 투명도가 0보다 높은 부분들에 대해서만 해당 color가 곱해진다고 해야되나? 덧씌워져서 적용됨! 
      // 그니까 컬러값을 할당해도 투명도가 0인 부분들은 해당 컬러의 적용을 받지 못한다는 뜻임.
      color,
      map: texture,
      transparent: true,
      // opacity: 0.5, // png 텍스처 자체에 이미 나무, 배경 부분의 투명도가 각각 별개로 지정되어 있기 때문에, opacity값을 따로 지정할 필요가 없음.
      alphaTest: 0.5, // 이렇게 하면 로드해 온 텍스처에서 투명도가 0.5보다 작은 픽셀은 렌더를 해주지 않음.
      side: THREE.DoubleSide, // 평면을 둘러보려면 양면을 모두 렌더해줘야 하니 DoubleSide로 지정함.
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh)

    mesh.rotation.y = rotY;
  }

  makeInstance(geometry, 'white', 0, './image/tree-01.png');
  makeInstance(geometry, 'white', Math.PI * 0.5, './image/tree-02.png');
  /**
   * 이런 방식으로 해결했을 때, 먼저 그려진 tree-01의 투명도가 0 ~ 1사이인, 
   * 나무 윤곽선 주변의 픽셀들이 하얀 테두리를 가지며 그려지는 것을 볼 수 있음.
   * 
   * 만약에 투명도가 1보다 작으면서 0보다 크다면, 나무 윤곽선 주변의 픽셀들은
   * 당연히 나중에 그려진 tree-02의 뒷부분이 비쳐져야 되는 거 아닌가? 근데 왜 하얀 테두리로 처리될까?
   * 
   * 앞에서 봤던 예제들과 똑같은 문제인거임. tree-02가 나중에 그려졌는데,
   * 픽셀의 depth값이 카메라에서 더 멀다 보니 WebGL이 tree-02의 비쳐져야 할 뒷부분을 안그려주는거임.
   * 
   * 이런 것들은 alphaTest나 tansparent 옵션을 조절해가면서 상황에 맞게 해결책을 찾아야 할거라고 함...
   * 즉, 3개의 예제에서 볼 수 있듯이 '완벽한 투명도는 구현하기 어렵다'는 게 핵심.
   */

  // 씬 안의 모든 하위 노드의 머티리얼에 대해 dat.GUI로 입력받은 값들을 속성값으로 할당해주는 헬퍼 클래스
  class AllMaterialPropertyGUIHelper {
    constructor(prop, scene) {
      this.prop = prop;
      this.scene = scene;
    }

    get value() {
      const {
        scene,
        prop
      } = this; // AllMaterialPropertyGUIHelper 인스턴스의 this.prop, this.scene을 const prop, const scene에 각각 할당함.
      let v; // 현재 할당되어 있는 속성값을 넣어놓을 변수
      // 전달받은 scene을 포함한 모든 하위노드들에 대하여 인자로 전달한 콜백함수를 실행시킴. 콜백함수는 각 노드들을 인자로 받음 
      scene.traverse((obj) => {
        if (obj.material && obj.material[prop] !== undefined) {
          // 각 자식노드들이 material이 존재하고, material.alphaTest 또는 material.transparent 값이 존재한다면,
          // if block으로 들어와서 v에 해당 material의 속성값을 넣어줌.
          // traverse는 모든 자식노드들에 대해 실행해주는거니까, 결국 가장 마지막에 실행된 자식노드의 obj.material.prop값이 할당되겠지.
          // 근데 자식노드가 평면 메쉬 두 개 밖에 없고, 둘 다 setter에 의해서 dat.GUI로 입력받은 값을 똑같이 할당받으니까 괜찮음.
          v = obj.material[prop];
        }
      });
      return v; // dat.GUI로 리턴해줘서 현재 객체의 속성값을 알려줘서 입력창의 값에 반영할 수 있도록 해줌. 
      // getter는 항상 setter에서 조정받은 값을 dat.GUI에 전달해 입력창의 값을 갱신해주는 역할을 하는거임.
    }

    set value(v) {
      const {
        scene,
        prop
      } = this;

      scene.traverse((obj) => {
        if (obj.material && obj.material[prop] !== undefined) {
          // 각 자식노드들이 material이 존재하고, material.alphaTest 또는 material.transparent 값이 존재한다면,
          // (존재할 수밖에 없음. 왜냐면 makeInstance에서 퐁-머티리얼을 생성할 때 alphaTest, transparent값을 모두 지정해줬으니까)
          // dat.GUI로 입력받은 값(v)을 material의 속성값에 할당해주고,
          // obj.material.needsUpdate를 true로 해줘서 해당 자식노드의 머티리얼이 recompile 되어야 함을 명시함.
          // material도 카메라나 orbitControls 같은 것처럼 중간에 속성값이 바뀌면 업데이트를 해줘야 하나 봄.
          obj.material[prop] = v;
          obj.material.needsUpdate = true;
        }
      });
    }
  }

  // GUI 인스턴스 생성함
  const gui = new GUI();
  // 씬 안의 모든 자식노드의 material.alphaTest값을 0 ~ 1사이의 값으로 입력받아서 조절해주는 입력창 추가
  gui.add(new AllMaterialPropertyGUIHelper('alphaTest', scene), 'value', 0, 1)
    .name('alphaTest')
    .onChange(requestAnimateIfNotRequested); // 자식노드들의 재질 속성값이 변했으니까 animate 메서드를 호출해서 변화한 속성값으로 렌더해서 화면에 보여줘야 확인이 가능하겠지
  // 씬 안의 모든 자식노드의 material.transparent값을 boolean(checkbox)로 입력받아서 할당해주는 입력창 추가
  gui.add(new AllMaterialPropertyGUIHelper('transparent', scene), 'value')
    .name('transparent')
    .onChange(requestAnimateIfNotRequested);

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // animate 메서드 실행 중 다음 animate 함수가 이미 request 되었을 때, OrbitControls.update()에 의해 중복호출되는 것을 방지하기 위한 변수값. 
  let animateRequested = false;

  function animate() {
    animateRequested = undefined;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
  }

  animate(); // 일단 최초로 한 번 호출해줘서 화면에 첫 프레임을 렌더해주도록 함.

  // animate 함수 내부에서 OrbitControls.update() 메서드에 의해 animate가 중복호출되는지 아닌지 체크해주는 함수
  function requestAnimateIfNotRequested() {
    if (!animateRequested) {
      animateRequested = true;
      requestAnimationFrame(animate);
    }
  }

  // OrbitControls에 change 이벤트가 발생하거나, 브라우저에 resize 이벤트가 발생할 시 animate를 호출함.
  controls.addEventListener('change', requestAnimateIfNotRequested);
  window.addEventListener('resize', requestAnimateIfNotRequested);
}

main();