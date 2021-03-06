//========== Helper Functions ==========
//From http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
//Generates a unique ID
function generateUUID(){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
        d += performance.now(); //use high-precision timer if available
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
}

//Updates the score in the DOM, given the ID of the element, and the new score value
function setScoreValue(elementName, value) {
    var element = document.getElementById(elementName);
    if (value) {
        element.innerHTML = value;
    }
    else {
        element.innerHTML = '0';
    }
}

//The following functions set the team display in the DOM and update the local team variable
function setTeamRed() {
    statusElement.innerHTML = 'You are on <span class="red">red</span> team.';
    malletX = redMalletElement.offsetLeft + malletRadius;
    malletY = redMalletElement.offsetTop + malletRadius;
    team = 'red';
}
function setTeamBlue() {
    statusElement.innerHTML = 'You are on <span class="blue">blue</span> team.';
    malletX = blueMalletElement.offsetLeft + malletRadius;
    malletY = blueMalletElement.offsetTop + malletRadius;
    team = 'blue';
}
function setTeamSpectator() {
    statusElement.innerHTML = 'You are a spectator.';
    team = 'spectator';
}

//Remove self from team, if we're on a team
function tryJoinSpectator(){
    if (team == 'red') {
        redPlayerRef.remove();
    }
    if (team == 'blue') {
        bluePlayerRef.remove();
    }
}

//Resets the puck location locally and in the DOM
function resetPuck() {
    puckVX = 0;
    puckVY = 0;
    puckX = defaultPuckX;
    puckY = defaultPuckY;
    updatePuckDOM();
}

//Updates the puck location in the DOM
function updatePuckDOM() {
    puckElement.style.left = puckX - puckRadius + 'px';
    puckElement.style.top = puckY - puckRadius + 'px';    
}

//Saves the local puck state to Firebase
function sendPuckState() {
    puckStateRef.set({
        x: puckX,
        y: puckY,
        vx: puckVX,
        vy: puckVY
    });
}

//Saves the local red mallet state to Firebase
function sendRedMalletState() {
    redMalletStateRef.set({
        x: malletX,
        y: malletY
    });
}

//Saves the local blue mallet state to Firebase
function sendBlueMalletState() {
    blueMalletStateRef.set({
        x: malletX,
        y: malletY
    });
}

//Sends a "keelalive" signal to let the opponent know we're still there
function sendBlueKeepAlive() {
    blueKeepAliveRef.set(Date.now());
}
function sendRedKeepAlive() {
    redKeepAliveRef.set(Date.now());
}

//========== Global (Page) Variables ==========
var playerId = generateUUID(); //The ID of our player
var team = 'spectator'; //The current state of the game
var malletRadius = 0; //The size of the mallet
var boardWidth = 0; //The width of the board
var boardHeight = 0; //The height of the board

//Mouse location - updated with "onmousemove"
var mouseX = 0;
var mouseY = 0;

//History of mallet location saved for velocity calculations
var lastMalletX = 0;
var lastMalletY = 0;

//The timestamp of the last frame
var lastTime = 0;

//If the mouse is clicked on the board
var mouseDown = false;

//The location of the mallet
var malletX = 0;
var malletY = 0;

//Puck location/velocity
var puckX = 0;
var puckY = 0;
var puckVX = 0;
var puckVY = 0;

//Set on DOM ready - the starting location of the puck based on the DOM location
var defaultPuckX = 0;
var defaultPuckY = 0;

//The score on each side
var redScore = 0;
var blueScore = 0;

//The last time a keepalive was sent by either player
var lastRedKeepAlive = Date.now();
var lastBlueKeepAlive = Date.now();

//Time since program start (from the DOM load)
var DOMStartTime = Date.now();

//Constants
var mu = 0.00001; //Coefficient of friction times gravity
var alpha = -0.0003; //Exponential velocity decay factor v = v0*exp(alpha*dt)
var puckVMax = 1.5; //Max v in pixels/ms
var keepAliveTimeout = 1000; //Time in ms before we consider the opponent missing
var goalWidth = 140; //The width of each goal

//DOM elements for faster access
var boardElement; //The "#container" div
var statusElement; //The div containing "You are a spectator", "Team red", etc.
var redMalletElement;
var blueMalletElement;
var puckElement;
var redCoverElement;
var blueCoverElement;

//Firebase references
var redScoreRef = new Firebase('https://firehockey.firebaseio.com/red_score');
var blueScoreRef = new Firebase('https://firehockey.firebaseio.com/blue_score');
var bluePlayerRef = new Firebase('https://firehockey.firebaseio.com/blue_player');
var redPlayerRef = new Firebase('https://firehockey.firebaseio.com/red_player');
var puckStateRef = new Firebase('https://firehockey.firebaseio.com/puck_state');
var redMalletStateRef = new Firebase('https://firehockey.firebaseio.com/red_mallet_state');
var blueMalletStateRef = new Firebase('https://firehockey.firebaseio.com/blue_mallet_state');
var redKeepAliveRef = new Firebase('https://firehockey.firebaseio.com/red_keep_alive');
var blueKeepAliveRef = new Firebase('https://firehockey.firebaseio.com/blue_keep_alive');

document.addEventListener('DOMContentLoaded', function(event) {
    //Set the elements up
    boardElement = document.getElementById('container');
    statusElement = document.getElementById('status');
    redMalletElement = document.getElementById('red-mallet');
    blueMalletElement = document.getElementById('blue-mallet');
    redCoverElement = document.getElementById('red-cover');
    blueCoverElement = document.getElementById('blue-cover');
    puckElement = document.getElementById('puck');
    boardWidth = boardElement.offsetWidth;
    boardHeight = boardElement.offsetHeight;
    
    //For the game logic
    lastTime = Date.now();
    
    //Get the puck location
    puckX = boardWidth / 2;
    puckY = boardHeight / 2;
    defaultPuckX = puckX;
    defaultPuckY = puckY;
    
    //You start as a spectator
    setTeamSpectator();

    //Calculate mallet/puck size
    malletRadius = document.getElementById('red-mallet').offsetWidth / 2;
    puckRadius = document.getElementById('puck').offsetWidth / 2;
    
    //Update scores whenever they are changed
    redScoreRef.on('value', function(snapshot){
        var value = snapshot.val();
        redScore = value;
        setScoreValue('score-red', snapshot.val());
        resetPuck();
    });
    blueScoreRef.on('value', function(snapshot){
        var value = snapshot.val();
        blueScore = value;
        setScoreValue('score-blue', snapshot.val());
        resetPuck();
    });
    
    //Listen for team changes
    bluePlayerRef.on('value', function(snapshot){
        if (snapshot.val() == playerId) {
            setTeamBlue();
        }
        else {
            if (team == 'blue') {
                setTeamSpectator();
            }
        }
    });
    redPlayerRef.on('value', function(snapshot){
        if (snapshot.val() == playerId) {
            setTeamRed();
        }
        else {
            if (team == 'red') {
                setTeamSpectator();
            }
        }
    });
    
    //Listen for puck state changes
    puckStateRef.on('value', function(snapshot){
        var state = snapshot.val();
        if (state) {
            puckX = state.x;
            puckY = state.y;
            puckVX = state.vx;
            puckVY = state.vy;
        }
    });
    
    //Listen for keepalive signals
    redKeepAliveRef.on('value', function(snapshot) {
        lastRedKeepAlive = Date.now();
    });
    blueKeepAliveRef.on('value', function(snapshot) {
        lastBlueKeepAlive = Date.now();
    });
    
    //Listen for mallet state changes
    blueMalletStateRef.on('value', function(snapshot){
        var state = snapshot.val();
        if (state) {
            blueMalletElement.style.left = state.x - malletRadius + 'px';
            blueMalletElement.style.top = state.y - malletRadius + 'px';            
        }
    });
    redMalletStateRef.on('value', function(snapshot){
        var state = snapshot.val();
        if (state) {
            redMalletElement.style.left = state.x - malletRadius + 'px';
            redMalletElement.style.top = state.y - malletRadius + 'px';            
        }
    });
    
    //Bind events to each of the buttons
    document.getElementById('join-red').onclick = function(){
        tryJoinSpectator();
        redPlayerRef.set(playerId);
    };
    document.getElementById('join-blue').onclick = function(){
        tryJoinSpectator();
        bluePlayerRef.set(playerId);
    };
    document.getElementById('join-spectator').onclick = function(){
        tryJoinSpectator();
    };
    document.getElementById('clear-score').onclick = function(){
        //Reset the scores in Firebase - listener should handle the rest
        redScoreRef.remove();
        blueScoreRef.remove();
        
        //Reset the puck location, and send this info to Firebase
        resetPuck();
        sendPuckState();
    };
    
    //Listen for mouse events
    document.onmousemove = function(event) {
        //Get the mouse location relative to our board
        var rectObject = boardElement.getBoundingClientRect();
        var output = {};
        mouseX =  event.pageX - rectObject.left - window.scrollX;
        mouseY =  event.pageY - rectObject.top - window.scrollY;
    };
    
    //Move the mallet on mouse down (signal to the game loop)
    boardElement.onmousedown = function(event) {
        event.preventDefault(); //Prevent drag and drop
        mouseDown = true;
        if (team == 'spectator') {
            alert('You need to join a team before you can move your mallet!');
        }
    };
    
    //When the mouse is released, release the mallet - use on document this time so a mouseup anywhere triggers this
    document.onmouseup = function(event) {
        event.preventDefault();
        mouseDown = false;
    };
    
    //The DOM has finished loading
    DOMStartTime = Date.now();
    
    //Start the game loops
    setInterval(fastLoop, 0);
    setInterval(fixedLoop, 1000 / 10);
    setInterval(keepAliveLoop, 1000 / 3);
});

//========== Game Logic ==========
//To be executed 10 times per second
function fixedLoop() {
    if (team == 'red') {
        sendRedMalletState();
    }
    if (team == 'blue') {
        sendBlueMalletState();
    }
}

//To be executed 3 times per second
//Let's the opponent/spectators know that a team is occupied
function keepAliveLoop() {
    if (team == 'red') {
        lastRedKeepAlive = Date.now();
        sendRedKeepAlive();
    }
    if (team == 'blue') {
        lastBlueKeepAlive = Date.now();
        sendBlueKeepAlive();
    }
    
    //If a certain amount of time has passed, deem the opponent "inactive" and hide their side
    //TODO: rework this section with Firebase onDisconnect functionality
    var passedDOMTime = Date.now() > DOMStartTime + keepAliveTimeout * 2;
    if (Date.now() < lastRedKeepAlive + keepAliveTimeout && passedDOMTime) {
        redCoverElement.style.display = 'none';
    }
    else {
        redCoverElement.style.display = 'block';
    }
    if (Date.now() < lastBlueKeepAlive + keepAliveTimeout && passedDOMTime) {
        blueCoverElement.style.display = 'none';
    }
    else {
        blueCoverElement.style.display = 'block';
    }
}

//To be executed as quickly as possible
function fastLoop() {
    time = Date.now();
    if (mouseDown && team != 'spectator') { //Only move the mallet if the mouse is down
        malletX = mouseX;
        malletY = mouseY;
    }

    //Ensure the mallet stays in bounds
    if (malletX < malletRadius) {
        malletX = malletRadius;
    }
    if (malletY < malletRadius) {
        malletY = malletRadius;
    }
    if (malletX > boardWidth - malletRadius) {
        malletX = boardWidth - malletRadius;
    }
    if (malletY > boardHeight - malletRadius) {
        malletY = boardHeight - malletRadius;
    }

    //Do specific bounds for each mallet, and update location in the DOM
    if (team == 'red') {
        if (malletY > boardHeight/2 - malletRadius) {
            malletY = boardHeight/2 - malletRadius;
        }
        redMalletElement.style.left = malletX - malletRadius + 'px';
        redMalletElement.style.top = malletY - malletRadius + 'px';
    }
    else if (team == 'blue') {
        if (malletY < boardHeight/2 + malletRadius) {
            malletY = boardHeight/2 + malletRadius;
        }
        blueMalletElement.style.left = malletX - malletRadius + 'px';
        blueMalletElement.style.top = malletY - malletRadius + 'px';
    }

    //Collision detection - update velocity here
    var isCollision = (malletX-puckX)*(malletX-puckX) + (malletY-puckY)*(malletY-puckY) < (malletRadius+puckRadius)*(malletRadius+puckRadius);
    if (isCollision && team != 'spectator') {
        //First, move the puck so that it's no longer inside the mallet
        var offsetX = puckX - malletX;
        var offsetY = puckY - malletY;
        var offsetMagnitude = Math.sqrt(offsetX*offsetX + offsetY*offsetY);
        puckX = malletX + offsetX / offsetMagnitude * (malletRadius + puckRadius);
        puckY = malletY + offsetY / offsetMagnitude * (malletRadius + puckRadius);
        
        //These lines compute the new velocity for the puck
        //We assume a perfectly elastic collision between the puck and the mallet
        //We approximate the mallet as having infinite mass (since we can't push the mouse around)
        var malletVX = (malletX - lastMalletX) / dt;
        var malletVY = (malletY - lastMalletY) / dt;
        var vRelX = puckVX - malletVX;
        var vRelY = puckVY - malletVY;
        offsetX = puckX - malletX;
        offsetY = puckY - malletY;
        offsetMagnitude = Math.sqrt(offsetX*offsetX + offsetY*offsetY);
        var unitOffsetX = offsetX / offsetMagnitude;
        var unitOffsetY = offsetY / offsetMagnitude;
        var vRelPerpX = (unitOffsetX) * (vRelX * unitOffsetX + vRelY * unitOffsetY);
        var vRelPerpY = (unitOffsetY) * (vRelX * unitOffsetX + vRelY * unitOffsetY);
        var newVRelX = vRelX - 2*vRelPerpX;
        var newVRelY = vRelY - 2*vRelPerpY;
        puckVX = newVRelX + malletVX;
        puckVY = newVRelY + malletVY;
        
        //This may happen occasionally if there is a divide by zero - safeguard just in case
        if (isNaN(puckVX) || isNaN(puckVY)) {
            puckVX = 0;
            puckVY = 0;
        }
        
        //Update the puck state in Firebase
        sendPuckState();
    }

    //Update change in time
    dt = time - lastTime;

    //Max velocity on the puck
    puckVMag = Math.sqrt(puckVX*puckVX + puckVY*puckVY);
    if (puckVMag > puckVMax) {
        puckVX = puckVMax * puckVX / puckVMag;
        puckVY = puckVMax * puckVY / puckVMag;
    }
    
    //Compute friction
    var newPuckVMag = puckVMag - mu * dt;
    newPuckVMag = newPuckVMag * Math.exp(alpha*dt);
    if (newPuckVMag < 0) {
        newPuckVMag = 0;
    }
    if (puckVMag > 0) {
        puckVX = newPuckVMag * puckVX / puckVMag;
        puckVY = newPuckVMag * puckVY / puckVMag;
    }
    
    //Move the puck around
    puckX = puckX + dt*puckVX;
    puckY = puckY + dt*puckVY;
    
    //Handle bounces off walls
    if (puckX > boardWidth - puckRadius) {
        puckX = boardWidth - puckRadius;
        puckVX = -puckVX;
    }
    if (puckX < puckRadius) {
        puckX = puckRadius;
        puckVX = -puckVX;
    }

    //Logic to check if we've scored
    var isInGoalLane = puckX > (boardWidth/2 - goalWidth/2) && puckX < (boardWidth/2 + goalWidth/2);
    if (puckY > boardHeight - puckRadius) {
        puckY = boardHeight - puckRadius;
        puckVY = -puckVY;
        if (team == 'blue' && isInGoalLane) {
            redScoreRef.set(redScore + 1);
        }
    }
    if (puckY < puckRadius) {
        puckY = puckRadius;
        puckVY = -puckVY;
        if (team == 'red' && isInGoalLane) {
            blueScoreRef.set(blueScore + 1);
        }
    }

    //Update the puck position in the DOM
    updatePuckDOM();

    //Update variables for the next iteration
    lastMalletX = malletX;
    lastMalletY = malletY;
    lastTime = time;
}