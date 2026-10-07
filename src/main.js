import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#world');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  $('#error').hidden = false;
  $('#status').textContent = '3D rendering unavailable';
  document.querySelectorAll('button').forEach(button => button.disabled = true);
}
if (renderer) init();

function init() {
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const software = debug && /swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
  renderer.setPixelRatio(software ? .7 : Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#161f18');
  scene.fog = new THREE.FogExp2('#161f18', .025);
  const camera = new THREE.PerspectiveCamera(43, 1, .03, 150);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .065;
  controls.minDistance = .16;
  controls.maxDistance = 28;
  controls.enablePan = true;
  controls.zoomSpeed = .65;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fff4cf', '#263d24', 1.25));
  const keyLight = new THREE.DirectionalLight('#ffe4ad', 3.2);
  keyLight.position.set(-5, 8, 9); scene.add(keyLight);
  const rim = new THREE.DirectionalLight('#e8d39c', 1.8);
  rim.position.set(5, 4, -5); scene.add(rim);
  const interiorLight = new THREE.PointLight('#ffdfa3', 10, 16, 1.4);
  interiorLight.position.set(0, 1, 1.5); scene.add(interiorLight);

  let seed = 413;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function texture(kind) {
    const size = 1024;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d');
    const data = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = random() * 16;
      if (kind === 'skin') {
        const stripe = Math.sin(x * .13 + Math.sin(y * .015) * 2) * .5 + .5;
        const yellow = Math.max(0, Math.sin(x * .009 + y * .002) - .2);
        data.data[i] = 156 + stripe * 54 + yellow * 30 + n;
        data.data[i+1] = 39 + stripe * 26 + yellow * 131 + n;
        data.data[i+2] = 23 + yellow * 29 + n * .5;
      } else {
        const distance = Math.hypot(x - size / 2, y - size / 2) / size;
        const fiber = Math.sin(Math.atan2(y-size/2,x-size/2) * 150 + distance * 35) * 3;
        const discolor = Math.exp(-distance * 13) * 25;
        data.data[i] = 231 + n * .7 - discolor + fiber;
        data.data[i+1] = 211 + n - discolor * 1.2 + fiber;
        data.data[i+2] = 158 + n - discolor * 1.3 + fiber;
      }
      data.data[i+3] = 255;
    }
    ctx.putImageData(data,0,0);
    if(kind === 'flesh') {
      // Fine, irregular cell walls and radial fibers across the cut face.
      ctx.lineWidth=.65;
      ctx.strokeStyle='rgba(117,95,43,.09)';
      for(let y=0;y<size;y+=9) for(let x=0;x<size;x+=11) {
        const xx=x+random()*5, yy=y+random()*4;
        ctx.beginPath();
        for(let k=0;k<=6;k++) {
          const a=k/6*Math.PI*2, r=4+random()*2;
          const px=xx+Math.cos(a)*r,py=yy+Math.sin(a)*r;
          if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.stroke();
      }
      ctx.strokeStyle='rgba(134,112,52,.035)';ctx.lineWidth=1;
      for(let i=0;i<300;i++) {
        const a=i/300*Math.PI*2;
        ctx.beginPath();ctx.moveTo(512+Math.cos(a)*80,512+Math.sin(a)*125);
        ctx.quadraticCurveTo(512+Math.cos(a+.035)*300,512+Math.sin(a+.035)*300,512+Math.cos(a)*530,512+Math.sin(a)*530);ctx.stroke();
      }
    }
    for (let i=0;i<14000;i++) {
      const x = random()*size, y=random()*size, r=random()*1.5+.3;
      ctx.fillStyle = kind==='skin' ? 'rgba(247,220,151,.3)' : 'rgba(117,101,48,.085)';
      ctx.beginPath();ctx.ellipse(x,y,r,r*.7,0,0,Math.PI*2);ctx.fill();
    }
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
  }
  const skinMap=texture('skin'), fleshMap=texture('flesh');
  const skinMaterial=new THREE.MeshPhysicalMaterial({map:skinMap,bumpMap:skinMap,bumpScale:.018,roughness:.32,clearcoat:.65,clearcoatRoughness:.3,side:THREE.DoubleSide});
  const fleshMaterial=new THREE.MeshPhysicalMaterial({map:fleshMap,bumpMap:fleshMap,bumpScale:.035,roughness:.65,clearcoat:.12,side:THREE.DoubleSide});
  const seedMaterial=new THREE.MeshPhysicalMaterial({color:'#452012',roughness:.3,clearcoat:.8});
  const fruit=new THREE.Group();scene.add(fruit);

  function profile(t) {
    const s=Math.sin(t), c=Math.cos(t);
    return [3.35*s*(1+.12*c),3.3*c-.64*Math.exp(-Math.pow(s/.24,2))*Math.sign(c)];
  }
  const positions=[],uv=[],indices=[];
  const rows=100,cols=128;
  for(let i=0;i<=rows;i++){
    const [r,y]=profile(i/rows*Math.PI);
    for(let j=0;j<=cols;j++){
      const a=Math.PI+j/cols*Math.PI;
      positions.push(r*Math.cos(a),y,r*Math.sin(a));uv.push(j/cols,i/rows);
      if(i<rows&&j<cols){const k=i*(cols+1)+j;indices.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
    }
  }
  const shellGeometry=new THREE.BufferGeometry();shellGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));shellGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));shellGeometry.setIndex(indices);shellGeometry.computeVertexNormals();
  fruit.add(new THREE.Mesh(shellGeometry,skinMaterial));
  const shape=new THREE.Shape();
  for(let i=0;i<=240;i++){
    const [x,y]=profile(i/240*Math.PI*2);
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  const hole=new THREE.Path();hole.absellipse(0,0,.63,1.38,0,Math.PI*2,true);shape.holes.push(hole);
  const fleshGeo=new THREE.ShapeGeometry(shape,100);
  const fleshUV=fleshGeo.getAttribute('uv'),fp=fleshGeo.getAttribute('position');
  for(let i=0;i<fp.count;i++)fleshUV.setXY(i,(fp.getX(i)+3.8)/7.6,(fp.getY(i)+3.8)/7.6);
  const face=new THREE.Mesh(fleshGeo,fleshMaterial);face.position.z=.012;fruit.add(face);
  // Thin red skin follows the perimeter of the cut surface.
  const contour=[];for(let i=0;i<=240;i++){const [x,y]=profile(i/240*Math.PI*2);contour.push(new THREE.Vector3(x,y,.015));}
  fruit.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(contour,true),240,.045,6,true),skinMaterial));
  // A passage through the core is open, so entering reveals a real 3D interior.
  const tunnelMat=new THREE.MeshStandardMaterial({map:fleshMap,bumpMap:fleshMap,bumpScale:.08,color:'#b99b56',roughness:.85,side:THREE.BackSide});
  const tunnel=new THREE.Mesh(new THREE.CylinderGeometry(.64,.55,2.5,48,12,true),tunnelMat);
  tunnel.rotation.x=Math.PI/2;tunnel.scale.z=2.1;tunnel.position.z=-1.24;fruit.add(tunnel);
  const chamber=new THREE.Mesh(new THREE.SphereGeometry(.6,32,24),new THREE.MeshStandardMaterial({color:'#6d4c25',roughness:.9,side:THREE.BackSide}));
  chamber.scale.set(1,2,1);chamber.position.z=-2.4;fruit.add(chamber);
  for(let i=0;i<4;i++){
    const side=i%2===0?-1:1,y=i<2?.62:-.65;
    const pocket=new THREE.Mesh(new THREE.SphereGeometry(.52,32,20),new THREE.MeshStandardMaterial({color:'#71532d',roughness:.8}));
    pocket.scale.set(.66,1.6,.12);pocket.position.set(side*.59,y,.022);pocket.rotation.z=side*(i<2?-.28:.28);fruit.add(pocket);
    const appleSeed=new THREE.Mesh(new THREE.SphereGeometry(.25,24,20),seedMaterial);
    appleSeed.scale.set(.65,1.4,.4);appleSeed.position.set(side*.56,y,.09);appleSeed.rotation.z=side*.35;fruit.add(appleSeed);
  }
  for(const side of [-1,1]) {
    const innerSeed=new THREE.Mesh(new THREE.SphereGeometry(.2,20,16),seedMaterial);
    innerSeed.scale.set(.5,1.3,.6);innerSeed.position.set(side*.46,side*.38,-1.65);innerSeed.rotation.z=side*.3;fruit.add(innerSeed);
  }
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.065,.11,.8,12),new THREE.MeshStandardMaterial({color:'#675536',roughness:.95}));
  stem.position.set(.04,2.95,-.13);stem.rotation.z=-.2;fruit.add(stem);
  const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.4,.75,1.35,.45);leafShape.quadraticCurveTo(.8,-.1,0,0);
  const leaf=new THREE.Mesh(new THREE.ShapeGeometry(leafShape),new THREE.MeshStandardMaterial({color:'#606e2d',roughness:.7,side:THREE.DoubleSide}));leaf.position.set(.04,3.15,-.13);leaf.rotation.set(.6,-.2,.2);fruit.add(leaf);

  const cells=new THREE.Group();scene.add(cells);cells.visible=false;
  const cellGeo=new THREE.DodecahedronGeometry(1,1);
  const wallMaterial=new THREE.MeshStandardMaterial({color:'#d1d7a0',roughness:.35,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide});
  const vacuoleMaterial=new THREE.MeshStandardMaterial({color:'#b9d396',roughness:.25,transparent:true,opacity:.35,depthWrite:false});
  const nucleusMaterial=new THREE.MeshStandardMaterial({color:'#d6ad63',roughness:.4});
  const cellEdges=new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(1,0),20);
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=0;z++){
    const cell=new THREE.Group();cell.position.set(x*2.15+(y%2)*.5,y*2.1,z*2.12);cell.rotation.set(random()*.4,random()*.7,random()*.4);
    const wall=new THREE.Mesh(cellGeo,wallMaterial);wall.scale.set(1.12,1.02,1.07);cell.add(wall);
    const edges=new THREE.LineSegments(cellEdges,new THREE.LineBasicMaterial({color:'#dce2b2',transparent:true,opacity:.4}));edges.scale.copy(wall.scale);cell.add(edges);
    const vacuole=new THREE.Mesh(new THREE.SphereGeometry(.72,20,16),vacuoleMaterial);vacuole.scale.set(1,.83,.95);cell.add(vacuole);
    const nucleus=new THREE.Mesh(new THREE.SphereGeometry(.19,16,12),nucleusMaterial);nucleus.position.set(.65,.28,.3);cell.add(nucleus);
    for(let j=0;j<4;j++){
      const organelle=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshStandardMaterial({color:'#bd8a4c',roughness:.7}));organelle.scale.set(1.9,.75,1);organelle.position.set((random()-.5)*1.3,(random()-.5)*1.5,(random()-.5)*1.3);cell.add(organelle);
    }
    cells.add(cell);
  }
  const molecules=new THREE.Group();scene.add(molecules);molecules.visible=false;
  const atomGeo=new THREE.SphereGeometry(1,24,16);
  const atomMaterials={C:new THREE.MeshPhysicalMaterial({color:'#738b6d',roughness:.28,clearcoat:.4}),O:new THREE.MeshPhysicalMaterial({color:'#c87a50',roughness:.25,clearcoat:.5}),H:new THREE.MeshPhysicalMaterial({color:'#e3e5cf',roughness:.26,clearcoat:.5})};
  const bondMat=new THREE.MeshStandardMaterial({color:'#babca2',roughness:.45});
  function atom(group,element,p){const mesh=new THREE.Mesh(atomGeo,atomMaterials[element]);mesh.scale.setScalar(element==='H'?.16:element==='O'?.29:.32);mesh.position.fromArray(p);group.add(mesh);}
  function bond(group,a,b){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const d=end.clone().sub(start);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,d.length(),10),bondMat);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());group.add(mesh);}
  // Simplified cyclic glucose: 5 carbons + 1 oxygen in the ring,
  // exocyclic C6, 5 hydroxyls and 7 carbon-bound H => C6 H12 O6.
  const glucose=new THREE.Group();molecules.add(glucose);
  const ring=Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*1.15,(i%2?-.18:.18),Math.sin(i*Math.PI/3)*1.15]);
  ring.forEach((p,i)=>{atom(glucose,i===5?'O':'C',p);bond(glucose,p,ring[(i+1)%6]);});
  for(let i=0;i<4;i++){
    const p=ring[i],r=new THREE.Vector3(p[0],0,p[2]).normalize();
    const o=[p[0]+r.x*.82,p[1]+(i%2?-.5:.5),p[2]+r.z*.82];
    const h=[o[0]+r.x*.42,o[1]+.4,o[2]+r.z*.42];
    atom(glucose,'O',o);atom(glucose,'H',h);bond(glucose,p,o);bond(glucose,o,h);
  }
  const p=ring[4],c6=[p[0]-.65,p[1]+.65,p[2]-.5],o6=[c6[0]-.7,c6[1]+.5,c6[2]],h6=[o6[0]-.4,o6[1]-.3,o6[2]+.3];
  atom(glucose,'C',c6);atom(glucose,'O',o6);atom(glucose,'H',h6);bond(glucose,p,c6);bond(glucose,c6,o6);bond(glucose,o6,h6);
  for(let i=0;i<5;i++){const p=ring[i],h=[p[0],p[1]+(i%2?.8:-.8),p[2]];atom(glucose,'H',h);bond(glucose,p,h);}
  for(const dz of [-.65,.65]){const h=[c6[0]+.2,c6[1]-.45,c6[2]+dz];atom(glucose,'H',h);bond(glucose,c6,h);}
  glucose.rotation.set(.55,.3,.2);
  for(let i=0;i<24;i++){
    const water=new THREE.Group();const a=[0,0,0],b=[.58,.45,0],c=[-.58,.45,0];
    atom(water,'O',a);atom(water,'H',b);atom(water,'H',c);bond(water,a,b);bond(water,a,c);
    const angle=i/24*Math.PI*2;const r=3.4+random()*3.5;water.position.set(Math.cos(angle)*r,(random()-.5)*7,Math.sin(angle)*r-1);water.rotation.set(random()*3,random()*3,random()*3);molecules.add(water);
  }
  // A sparse field of suspended particles adds depth without external assets.
  const dustPos=[];for(let i=0;i<260;i++)dustPos.push((random()-.5)*30,(random()-.5)*22,(random()-.5)*24);
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPos,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#dfd4a1',size:.025,transparent:true,opacity:.4,depthWrite:false}));scene.add(dust);

  const modes={
    fruit:{group:fruit,title:'The apple',detail:'A crisp world of flesh, fibers, and seeds.',scale:'1 : 1',field:'~ 8 cm',caption:'FLESH & CORE',headline:'A world<br>within.',description:'Beneath a familiar skin, an unfamiliar landscape. Step inside an apple and explore the architecture of life.',position:[5.1,2.1,12.6],target:[0,0,0],inside:[0,.1,-.65],insideTarget:[0,0,-2.2]},
    cell:{group:cells,title:'Plant cells',detail:'Cell walls enclose fluid-filled vacuoles and golden nuclei.',scale:'~ 400×',field:'~ 200 μm',caption:'WALLS & VACUOLES',headline:'Life, up<br>close.',description:'A delicate architecture holds every bite together. Explore plant cell walls, fluid-filled vacuoles, and the nuclei tucked inside.',position:[5,2,12],target:[0,0,0],inside:[.1,.1,3.3],insideTarget:[0,0,0]},
    molecule:{group:molecules,title:'Water & glucose',detail:'Water surrounds a glucose molecule. H₂O / C₆H₁₂O₆.',scale:'~ 40 million×',field:'~ 2 nm',caption:'WATER & GLUCOSE',headline:'The little<br>things.',description:'Meet the molecules behind the sweetness. A glucose ring floats in a field of water: carbon in sage, oxygen in copper, hydrogen in ivory.',position:[4,3.5,10.5],target:[0,0,0],inside:[1.5,1.4,4.4],insideTarget:[0,0,0]}
  };
  let mode='fruit',inside=false,transition=null,noticeTimer;
  let mobileViewport=innerWidth<=650;
  const keys=new Set();
  function notice(text){$('#status').textContent=text;$('#status').style.opacity='1';clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#status').style.opacity='0',3500);}
  function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.setViewOffset(w,h,w>650?-w*.095:0,w<=650?-h*.09:0,w,h);camera.updateProjectionMatrix();
    const nextMobile=w<=650;
    if(nextMobile!==mobileViewport&&!inside)fly(modes[mode].position,modes[mode].target);
    mobileViewport=nextMobile;
  }
  function fly(position,target){
    position=position.map(v=>v*(!inside&&innerWidth<=650?1.8:1));
    transition={from:camera.position.clone(),to:new THREE.Vector3(...position),fromTarget:controls.target.clone(),toTarget:new THREE.Vector3(...target),started:performance.now()};}
  function updateUI(){
    const config=modes[mode];
    document.body.classList.toggle('inside',inside);
    $('.intro h1').innerHTML=inside?'Keep<br>exploring.':config.headline;
    $('#description').textContent=inside?'Drag to look around. Move through this space with the arrow controls or WASD. Change scale to discover another world.':config.description;
    $('#specimen-title').textContent=config.title;$('#specimen-detail').textContent=config.detail;$('#scale-value').textContent=config.scale;$('#field-value').textContent=config.field;$('#caption').textContent=config.caption;
    $('#caption-number').textContent={fruit:'01',cell:'02',molecule:'03'}[mode];
    $('#enter').innerHTML=(inside?'Return to overview':mode==='fruit'?'Enter the apple':mode==='cell'?'Explore the cells':'Explore molecules')+' <span>→</span>';
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    canvas.dataset.mode=mode;canvas.dataset.inside=String(inside);
  }
  function setMode(next){
    mode=next;inside=false;keys.clear();Object.entries(modes).forEach(([key,c])=>c.group.visible=key===mode);
    fly(modes[mode].position,modes[mode].target);updateUI();notice({fruit:'Fruit scale · explore the core',cell:'Cell scale · walls, vacuoles, and nuclei',molecule:'Molecular scale · water and glucose'}[mode]);
  }
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('#enter').addEventListener('click',()=>{inside=!inside;const c=modes[mode];fly(inside?c.inside:c.position,inside?c.insideTarget:c.target);updateUI();notice(inside?'You’re inside · use WASD or the arrows to move':'Back at the overview');});
  $('#reset').addEventListener('click',()=>{inside=false;keys.clear();fly(modes[mode].position,modes[mode].target);updateUI();notice('View reset');});
  const keyMap={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',q:'down',e:'up'};
  window.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    const action=keyMap[event.key]||keyMap[event.key.toLowerCase()];if(action){event.preventDefault();keys.add(action);transition=null;}
  });
  window.addEventListener('keyup',event=>{keys.delete(keyMap[event.key]||keyMap[event.key.toLowerCase()]);});
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>keys.clear());
  canvas.addEventListener('pointerdown',()=>transition=null);
  canvas.addEventListener('wheel',event=>{
    transition=null;
    const distance=camera.position.distanceTo(controls.target);
    if(event.deltaY<0 && distance<1.5 && mode!=='molecule')setMode(mode==='fruit'?'cell':'molecule');
    else if(event.deltaY>0 && distance>24 && mode!=='fruit')setMode(mode==='molecule'?'cell':'fruit');
  },{passive:true});
  document.querySelectorAll('[data-move]').forEach(b=>{
    b.addEventListener('pointerdown',event=>{event.preventDefault();b.setPointerCapture(event.pointerId);transition=null;keys.add(b.dataset.move);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>keys.delete(b.dataset.move));
  });
  let audio,oscillators=[],soundOn=false;
  $('#sound').addEventListener('click',async()=>{
    try{
      if(!audio){audio=new AudioContext();const gain=audio.createGain();gain.gain.value=.018;gain.connect(audio.destination);[110,164.81,220].forEach(f=>{const osc=audio.createOscillator();osc.type='sine';osc.frequency.value=f;osc.connect(gain);osc.start();oscillators.push(osc);});}
      if(soundOn)await audio.suspend();else await audio.resume();soundOn=!soundOn;
      $('#sound').setAttribute('aria-pressed',String(soundOn));$('#sound').innerHTML=(soundOn?'Sound on':'Sound off')+' <span>◌</span>';
    }catch{notice('Ambient audio is unavailable in this browser');}
  });
  window.addEventListener('resize',resize);resize();
  camera.position.fromArray(modes.fruit.position);if(innerWidth<=650)camera.position.multiplyScalar(1.8);controls.target.fromArray(modes.fruit.target);controls.update();updateUI();
  const clock=new THREE.Timer();let elapsed=0;
  const forward=new THREE.Vector3(),right=new THREE.Vector3(),movement=new THREE.Vector3();
  function frame(){
    clock.update();const delta=Math.min(clock.getDelta(),.05);elapsed+=delta;
    if(transition){
      const duration=matchMedia("(prefers-reduced-motion: reduce)").matches?1:1500;
      const t=Math.min((performance.now()-transition.started)/duration,1),ease=t*t*(3-2*t);
      camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,ease);if(t===1)transition=null;
    }
    if(keys.size){
      camera.getWorldDirection(forward);right.crossVectors(forward,camera.up).normalize();movement.set(0,0,0);
      if(keys.has('forward'))movement.add(forward);if(keys.has('back'))movement.sub(forward);if(keys.has('left'))movement.sub(right);if(keys.has('right'))movement.add(right);if(keys.has('up'))movement.y+=1;if(keys.has('down'))movement.y-=1;
      movement.normalize().multiplyScalar(delta*(inside?1.3:2.8));
      const next=camera.position.clone().add(movement);if(next.length()<35){camera.position.copy(next);controls.target.add(movement);}
    }
    controls.update();dust.rotation.y=elapsed*.006;
    if(mode==='molecule'){molecules.children.forEach((g,i)=>{if(i>0)g.rotation.y+=delta*.025;});}
    renderer.render(scene,camera);
    canvas.dataset.rendered='true';
    canvas.dataset.renderedMode=mode;
    canvas.dataset.camera=camera.position.toArray().map(v=>v.toFixed(3)).join(',');
    requestAnimationFrame(frame);
  }
  frame();notice('Your world is ready · drag to explore');
}
