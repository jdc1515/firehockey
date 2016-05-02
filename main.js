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
    document.getElementById('status').innerHTML = 'You are on <span class="red">red</span> team.';
    team = 'red';
}

function setTeamBlue() {
    document.getElementById('status').innerHTML = 'You are on <span class="blue">blue</span> team.';
    team = 'blue';
}

function setTeamSpectator() {
    document.getElementById('status').innerHTML = 'You are a spectator.';
    team = 'spectator';
}

var currentRedPlayer = null;
var currentBluePlayer = null;
var playerId = generateUUID();
var team = 'spectator';
var malletRadius = 0;

document.addEventListener('DOMContentLoaded', function(event) {
    //You start as a spectator
    setTeamSpectator();

    //Calculate mallet size
    malletRadius = document.getElementById('red-mallet').offsetWidth / 2;
    console.log(malletRadius);
    
    var redScoreRef = new Firebase('https://firehockey.firebaseio.com/red_score');
    var blueScoreRef = new Firebase('https://firehockey.firebaseio.com/blue_score');
    var bluePlayerRef = new Firebase('https://firehockey.firebaseio.com/blue_player');
    var redPlayerRef = new Firebase('https://firehockey.firebaseio.com/red_player');
    
    //Update scores whenever they are changed
    redScoreRef.on('value', function(snapshot){
        setScoreValue('score-red', snapshot.val());
    });
    blueScoreRef.on('value', function(snapshot){
        setScoreValue('score-blue', snapshot.val());
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
    
    //Bind events to each of the buttons
    function tryJoinSpectator(){
        if (team == 'red') {
            redPlayerRef.remove();
        }
        if (team == 'blue') {
            bluePlayerRef.remove();
        }
    }
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
    }
    document.getElementById('clear-score').onclick = function(){
        redScoreRef.remove();
        blueScoreRef.remove();
    }
    
    //Start the game loop
    setInterval(fastLoop, 0);
});

//To be executed 10 times per second
function fixedLoop() {
    
}

//To be executed as quickly as possible
function fastLoop() {
    
}