console.log("disable power-save"); // Debug print statement
Bangle.setLCDPower(1);      // keep LCD on
Bangle.setLCDTimeout(0);    // never auto-dim
Bangle.setLCDBrightness(1); // optional: full brightness


  console.log("buzz pattern dot dash dot"); // Debug print statement
buzzTwice(); // Buzz Twice at Startup


Bangle.on('kill', () => {
  console.log("App exiting due to launching another"); // Debug print statement
  Bangle.setLCDTimeout(10); // restore default auto-dim timeout
  Bangle.setLCDBrightness(0.5); // restore default brightness
  Bangle.setOptions({ powerSave: "on" }); // restore power-saving mode
});

let timeoutTime = 60;
// Curling Game Timer for Bangle.js
// Two alternating count-up timers and a 1-minute timeout countdown

let team1Time = 0;
let team2Time = 0;
let activeTimer = null; // 'team1', 'team2', or 'timeout'
let interval = null;
let timeoutActive = false;
let lastTimeoutTap = 0; // Track last tap time for double-tap detection

function draw() {
  g.clear();
  // Team 1 (Red) - Top third
  g.setColor(1,0,0);
  g.fillRect(0,0,g.getWidth(),g.getHeight()/3);
  g.setColor(1,1,1);
 // g.setFont('Vector',30);
  //g.drawString("Team 1",g.getWidth()/2,20);
  g.setFont('Vector',40);
  g.setFontAlign(0,0);
  g.drawString(formatTime(team1Time),g.getWidth()/2,g.getHeight()/6);

  // Timeout (Grey) - Middle third
  g.setColor(0.5,0.5,0.5);
  g.fillRect(0,g.getHeight()/3,g.getWidth(),2*g.getHeight()/3);
  g.setColor(1,1,1);
  g.setFont('Vector',30);
  g.setFontAlign(-1,0);
  g.drawString(timeoutTime+"s",10,g.getHeight()/2);

  // Team 2 (Yellow) - Bottom third
  g.setColor(1,1,0);
  g.fillRect(0,2*g.getHeight()/3,g.getWidth(),g.getHeight());
  g.setColor(0,0,0);
 // g.setFont('Vector',30);
  //g.drawString("Team 2",g.getWidth()/2,2*g.getHeight()/3+20);
  g.setFont('Vector',40);
  g.setFontAlign(0,0);
  g.drawString(formatTime(team2Time),g.getWidth()/2,5*g.getHeight()/6);
}

function formatTime(t) {
  let h = Math.floor(t/3600);
  let m = Math.floor((t%3600)/60);
  let s = t%60;
  return h+":"+(m<10?"0":"")+m+":"+(s<10?"0":"")+s;
}

function startTimer(timer) {
  if (interval) clearInterval(interval);
  activeTimer = timer;
  if (timer == "team2") {
    console.log("Starting timer for Team 2"); // Debug print statement
  }
  if (timer=="team1") {
    interval = setInterval(()=>{team1Time++;draw();},1000);
  } else if (timer=="team2") {
    interval = setInterval(()=>{team2Time++;draw();},1000);
  } else if (timer=="timeout") {
    timeoutActive = true;
    interval = setInterval(()=>{
      if (timeoutTime>0) {
        timeoutTime--;
        draw();
      } else {
        clearInterval(interval);
        interval = null;
        activeTimer = null;
        Bangle.buzz();
        setTimeout(()=>Bangle.buzz(),500);
        setTimeout(()=>Bangle.buzz(),1000);
        timeoutActive = false;
        timeoutTime = 60;
        draw();
      }
    },1000);
  }
}

function pauseTimer() {
  if (interval) clearInterval(interval);
  interval = null;
  activeTimer = null;
}
/*********************************************************************
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function buzzWithDuration(duration) {
  return new Promise(resolve => {
    Bangle.buzz(); // Start the buzz
    setTimeout(() => {
      Bangle.buzz(0); // Stop the buzz
      resolve();
    }, duration);
  });
}
*******************************************************/
function buzzTwice() 
{
  console.log("buzzTwice: Starting two buzzes with a 250ms delay"); // Debug print statement
  Bangle.buzz(300).then(() => new Promise(r => setTimeout(r, 200))).then(()=>Bangle.buzz(300));
}


Bangle.on('touch', (button, xy) => {
  let y = xy.y;
  let h = g.getHeight();
  let x = xy.x;
  if (y < h/3) {
    // Team 1 area
    let wasTeam1 = (activeTimer == "team1");
    pauseTimer();
    if (timeoutActive) {
      timeoutActive = false;
      timeoutTime = 60;
    }
    if (wasTeam1) {
      startTimer("team2");
      console.log("Starting timer for Team 2"); // Debug print statement
      buzzTwice(); // Two buzzes for Team 2
    } else {
      startTimer("team1");
      Bangle.buzz(); // Single buzz for Team 1
    }
    draw();
  } else if (y > 2 * h / 3) {
    // Team 2 area
    let wasTeam2 = (activeTimer == "team2");
    pauseTimer();
    if (timeoutActive) {
      timeoutActive = false;
      timeoutTime = 60;
    }
    if (wasTeam2) {
      startTimer("team1");
      Bangle.buzz(); // Single buzz for Team 1
    } else {
      startTimer("team2");
      console.log("Starting timer for Team 2"); // Debug print statement
      buzzTwice(); // Two buzzes for Team 2
    }
    draw();
  } else {
    // Timeout area - left half of grey band only
    if (x < g.getWidth()/2) {
      let now = Date.now();
      // Double-tap detection (tap within 1 second = reset game)
      if (now - lastTimeoutTap < 1000 && lastTimeoutTap > 0) {
        lastTimeoutTap = 0; // Reset to prevent triple-tap
        pauseTimer(); // Pause any active timer before showing prompt
        let wasTimeout = timeoutActive;
        timeoutActive = false; // Prevent timeout from continuing
        E.showPrompt("Reset game?",{title:"Confirm",timeout:10000}).then(function(confirmed) {
          if (confirmed) {
            pauseTimer(); // Ensure everything is stopped
            team1Time = 0;
            team2Time = 0;
            timeoutTime = 60;
            timeoutActive = false;
            activeTimer = null; // Ensure no timer is active
            draw();
          } else {
            // User cancelled - restore timeout state if it was active
            if (wasTimeout) {
              timeoutActive = true;
              startTimer("timeout");
            }
            draw();
          }
        });
      } else if (!timeoutActive) {
        // Single tap - start timeout
        lastTimeoutTap = now;
        pauseTimer();
        startTimer("timeout");
        draw();
      } else {
        // Timeout already active, still update tap time for potential double-tap
        lastTimeoutTap = now;
      }
    }
  }
});

draw();


