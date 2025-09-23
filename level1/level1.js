
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
const background = new Image();
background.src="../Assets/level1background.jpg"; 
let startfade=false;
let alpha = 0;
const fadetime = 4000;
let starttime;

function draw() {
    const timegone = Date.now() - starttime;
    alpha = Math.min(timegone / fadetime, 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = alpha;

    ctx.drawImage(background, 0, 0, background.width, background.height, 0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 1;

    if (alpha < 1) {
        requestAnimationFrame(draw);
    }
}
document.getElementById("play").addEventListener("click", function(){
    document.getElementById("container1").style.display = "none";
    starttime=Date.now();
    startfade=true;
    draw();
})
const birdimages=[];
birdimages.push("Assets/character1.jpeg");
birdimages.push("Assets/character2.jpeg");
birdimages.push("Assets/character3.jpeg");
birdimages.push("Assets/character4.jpeg");
 
const numofbirds = Math.floor(Math.random()*4 + 7);
const displayedbirds = [];
for(let i=0;i<numofbirds;i++){
    const randomindex =Math.floor(Math.random()*birdimages.length);
   displayedbirds.push(birdimages[randomindex]);
}



