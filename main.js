import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const stlloader = new STLLoader();
var renderer, cube, scene, camera, controls;

var position = new THREE.Vector3;

let meshPosition = {
	x : '0',
	y : '0',
	z : '0'
}
let meshRotation = {
	x : '0',
	y : '0',
	z : '0'
}

Init();
meshPosition.x = 0; meshPosition.y = 0; meshPosition.z = 0;
meshRotation.x = -3.14159/2; meshRotation.y = 0; meshRotation.z = 0;
loadObject('/lite6/visual/base.stl', meshPosition, meshRotation);


animate();

function Init()
{
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	

	// Ground
	var plane = new THREE.Mesh( new THREE.PlaneGeometry( 40, 40 ), new THREE.MeshPhongMaterial( { ambient: 0x999999, color: 0x999999, specular: 0x101010 } ) );
	plane.rotation.x = -Math.PI/2;
	plane.position.y = 0;
	scene.add( plane );

	
	camera.position.set(3,3,3);

	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	// Lights
	scene.add( new THREE.AmbientLight( 0x777777 ) );

	addShadowedLight( 1, 1, 1, 0xffffff, 1.35 );
	addShadowedLight( 0.5, 1, -1, 0xffaa00, 1 );

	// Controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.enablePan = true;
	controls.enableZoom = true;
	controls.target.set(0,1,0); // = new THREE.Vector3(0, 1, 0);
	controls.update();

}

function animate() {
	requestAnimationFrame( animate );

	renderer.render( scene, camera );
}

function addShadowedLight( x, y, z, color, intensity ) {

	var directionalLight = new THREE.DirectionalLight( color, intensity );
	directionalLight.position.set( x, y, z )
	scene.add( directionalLight );

	directionalLight.castShadow = true;
	//directionalLight.shadowCameraVisible = true;

	var d = 1;
	directionalLight.shadowCameraLeft = -d;
	directionalLight.shadowCameraRight = d;
	directionalLight.shadowCameraTop = d;
	directionalLight.shadowCameraBottom = -d;

	directionalLight.shadowCameraNear = 1;
	directionalLight.shadowCameraFar = 4;

	directionalLight.shadowMapWidth = 2048;
	directionalLight.shadowMapHeight = 2048;

	directionalLight.shadowBias = -0.005;
	directionalLight.shadowDarkness = 0.15;

}

// Object
function loadObject (url,  meshPosition, meshRotation){
	stlloader.load(url, function(geometry){

		var material = new THREE.MeshPhongMaterial( { ambient: 0xff5533, color: 0xff5533, specular: 0x111111, shininess: 200, opacity:1 } );
		var mesh = new THREE.Mesh( geometry, material );
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.scale.set(1, 1, 1)
		mesh.position.set(meshPosition.x, meshPosition.y, meshPosition.z);
		mesh.rotation.set(meshRotation.x, meshRotation.y, meshRotation.z);
		console.log("position: ", mesh.position.x, mesh.position.y, mesh.position.z)
		console.log("scale : ", mesh.scale)
		console.log("alpha : ", mesh.alpha)
		scene.add( mesh );
	});
}