import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

import { LoadingManager } from 'three';
import URDFLoader from 'urdf-loader';

import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';


const manager = new LoadingManager();
const loader = new URDFLoader( manager );

const objectManager = new LoadingManager();
const objectLoader = new URDFLoader( objectManager );

var cube, controls, scene, camera, renderer, clock, transformControls;

let physicsWorld; 

let colGroupFloor = 1, colGroupRobot = 1, colGroupObject = 1

var position = new THREE.Vector3;

var rigidBodies = [], tmpTrans;

let ballObject = null, 
moveDirection = { left: 0, right: 0, forward: 0, back: 0 }
const STATE = { DISABLE_DEACTIVATION : 4 }

let kObject = null, 
kMoveDirection = { left: 0, right: 0, forward: 0, back: 0 }, 
tmpPos = new THREE.Vector3(), tmpQuat = new THREE.Quaternion();

const FLAGS = { CF_KINEMATIC_OBJECT: 2 }

let ammoTmpPos = null, ammoTmpQuat = null;

//Ammojs Initialization
Ammo().then( start )


function loadURDF()
{
    loader.packages = {
        packageName : './package/dir/'              // The equivalent of a (list of) ROS package(s):// directory
    };
    loader.load(
      'ufactory_description/lite6/urdf/lite6.urdf', // The path to the URDF within the package OR absolute                       
      robot => {
    
        // The robot is loaded!
        scene.add( robot );

        transformControls = new TransformControls( camera, renderer.domElement );
        transformControls.size = 0.75;
        transformControls.showX = false;
        transformControls.space = 'world';
        transformControls.attach( robot.links['link_eef']);
        scene.add( transformControls );

        // disable orbitControls while using transformControls
        transformControls.addEventListener( 'mouseDown', () => controls.enabled = false );
        transformControls.addEventListener( 'mouseUp', () => controls.enabled = true );

        //console.log(robot.joints)
        //robot.setJointValue('joint2', 3.141);   // need to put le full name of the joint
        robot.position.set(0,0,0.63)
    
      }
    );
}


function loadURDFObject(ob, i)
{
    objectLoader.packages = {
        packageName : './package/dir/'              // The equivalent of a (list of) ROS package(s):// directory
    };
    objectLoader.load(
        ob.url[i], // The path to the URDF within the package OR absolute                       
        object => {
    
        // The robot is loaded!
        scene.add( object );

        object.position.set(ob.position.X[i], ob.position.Y[i], ob.position.Z[i])


        // let mass = 1
        // //Ammojs Section
        // let transform = new Ammo.btTransform();
        // transform.setIdentity();
        // transform.setOrigin( new Ammo.btVector3( ob.position.X[i], ob.position.Y[i], ob.position.Z[i] ) );
        // transform.setRotation( new Ammo.btQuaternion( ob.rotation.X[i], ob.rotation.X[i], ob.rotation.X[i], 1 ) );
        // let motionState = new Ammo.btDefaultMotionState( transform );

        // let colShape = new Ammo.btBoxShape( 1 );
        // let colShape1 = new Ammo.btBoxShape(object);          // TODO vérifier que ça donne bien la collision de l'objet// ça donne pas la bonne collision 
        // colShape.setMargin( 0.05 );

        // let localInertia = new Ammo.btVector3( 0, 0, 0 );
        // colShape1.calculateLocalInertia( mass, localInertia );       //BUG si je met le shape de mon objet, il passe au travers du sol ... 


        // let rbInfo = new Ammo.btRigidBodyConstructionInfo( 1 /*mass*/ , motionState, colShape1, localInertia );
        // let body = new Ammo.btRigidBody( rbInfo );

        // body.setFriction(4);
        // body.setRollingFriction(10);

        // body.setActivationState( STATE.DISABLE_DEACTIVATION )


        // physicsWorld.addRigidBody( body, colGroupObject, colGroupFloor | colGroupRobot);

        // object.userData.physicsBody = body;
        // rigidBodies.push(object);

        // body.threeObject = object;

      }
    );

}


function displayURDF()
{
    let ob = {
        url: [
            'urdfObjects/table.urdf',
            //'urdfObjects/duck_vhacd.urdf'
        ],
        position: {
            X : [0, 0.2],
            Y : [0, 0.3],
            Z : [0, 1]
        },
        rotation: {
            X : [0, 0],
            Y : [0, 0],
            Z : [0, 0]
        },

    };

    
    for (let i = 0; i< ob.url.length; i++)
    {
        loadURDFObject(ob, i);
    }
}

function start()
{
	tmpTrans = new Ammo.btTransform();
	ammoTmpPos = new Ammo.btVector3();
	ammoTmpQuat = new Ammo.btQuaternion();
	setupPhysicsWorld();
	setupGraphics();

    loadURDF();
    displayURDF();

	createFloor();

	setupEventHandlers();

    renderFrame();
}

function setupPhysicsWorld(){

    let collisionConfiguration  = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher              = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache    = new Ammo.btDbvtBroadphase(),
        solver                  = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld           = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, 0, -10));

}


function setupGraphics(){

    //create clock for timing
    clock = new THREE.Clock();

    //create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xbfd1e5 );

	// Ground
	//var plane = new THREE.Mesh( new THREE.PlaneGeometry( 40, 40 ), new THREE.MeshPhongMaterial( { ambient: 0x999999, color: 0x999999, specular: 0x101010 } ) );
	//plane.rotation.x = -Math.PI/2;
	//plane.position.y = 0;
	//scene.add( plane );

    //create camera
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.up.set(0,0,1)
    camera.position.set(2,2,1);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    //Add hemisphere light
    let hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.1 );
    hemiLight.color.setHSL( 0.6, 0.6, 0.6 );
    hemiLight.groundColor.setHSL( 0.1, 1, 0.4 );
    hemiLight.position.set( 0, 50, 0 );
    scene.add( hemiLight );

    //Add directional light
    let dirLight = new THREE.DirectionalLight( 0xffffff , 1);
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( -1, 1.75, 1 );
    dirLight.position.multiplyScalar( 100 );
    scene.add( dirLight );

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    let d = 50;

    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;

    dirLight.shadow.camera.far = 13500;

    //Setup the renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xbfd1e5 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    renderer.shadowMap.enabled = true;

	// Controls
	controls = new OrbitControls( camera, renderer.domElement );
	controls.enablePan = true;
	controls.enableZoom = true;
	controls.target.set(0,1,0); // = new THREE.Vector3(0, 1, 0);
	controls.update();

}


function renderFrame(){

    let deltaTime = clock.getDelta();

	updatePhysics( deltaTime );

    renderer.render( scene, camera );

    requestAnimationFrame( renderFrame );

}


function createFloor(){
    
    let pos = {x: 0, y: 0, z: -1};
    let scale = {x: 150, y: 150, z: 2};
    let quat = {x: 0, y: 0, z: 0, w: 1};
    let mass = 0;

    //threeJS Section
    let blockPlane = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));

    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.scale.set(scale.x, scale.y, scale.z);

    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;

    scene.add(blockPlane);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btBoxShape( new Ammo.btVector3( scale.x * 0.5, scale.y * 0.5, scale.z * 0.5 ) );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

	body.setFriction(4);
	body.setRollingFriction(10);

    physicsWorld.addRigidBody( body, colGroupFloor, colGroupRobot | colGroupObject);
}

function setupEventHandlers(){

    window.addEventListener( 'keydown', handleKeyDown, false);
    window.addEventListener( 'keyup', handleKeyUp, false);

}


function handleKeyDown(event){

    let keyCode = event.keyCode;

    switch(keyCode){

        case 90: //W: FORWARD
            moveDirection.forward = 1
            break;

        case 83: //S: BACK
            moveDirection.back = 1
            break;

        case 81: //Q: LEFT
            moveDirection.left = 1
            break;

        case 68: //D: RIGHT
            moveDirection.right = 1
            break;

		case 38: //↑: FORWARD
			kMoveDirection.forward = 1
			break;
			
		case 40: //↓: BACK
			kMoveDirection.back = 1
			break;
		
		case 37: //←: LEFT
			kMoveDirection.left = 1
			break;
		
		case 39: //→: RIGHT
			kMoveDirection.right = 1
			break;
    }
}


function handleKeyUp(event){
    let keyCode = event.keyCode;

    switch(keyCode){
        case 90: //FORWARD
            moveDirection.forward = 0
            break;

        case 83: //BACK
            moveDirection.back = 0
            break;

        case 81: //LEFT
            moveDirection.left = 0
            break;

        case 68: //RIGHT
            moveDirection.right = 0
            break;

		case 38: //↑: FORWARD
			kMoveDirection.forward = 0
			break;
			
		case 40: //↓: BACK
			kMoveDirection.back = 0
			break;
			
		case 37: //←: LEFT
			kMoveDirection.left = 0
			break;
			
		case 39: //→: RIGHT
			kMoveDirection.right = 0
			break;

    }

}


function updatePhysics( deltaTime ){

    // Step world
    physicsWorld.stepSimulation( deltaTime, 10 );

    // Update rigid bodies
    for ( let i = 0; i < rigidBodies.length; i++ ) {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {

            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

        }
    }

}
