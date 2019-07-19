This voice/text chat uses a node websocket server, an html and javscript client and a javascript web worker. It consists of four files:

  1. client.htm. The client file which is written in html5 and javascript.

  2. server.js. A Node ws (https://www.npmjs.com/package/ws) websocket server file.

  3. worker.js. A short javascript web worker file with a single function. 

  4. silence.mp3. A short sound file that plays about a second of silence.

In order to get these files running on your website, just put them into the public root directory after changing the following in their codes:

  1. In the client file, change "example.com" to your website's URL.

  2. In the server file, change the paths of the secure certificate (cert:) and key (key:) to those on your server. You should be able find those paths in your server's httpd.conf file. 

  3. If not already installed, install node.js and each of the required libraries (fs, https, ws, moment, and wav) on your server so that they can be accessed from your public root directory. 

  4. Start the server. Use putty or telnet to go to the directory where the server.js file can be found and then type:

  node server.js

  Press enter and look for error messages which would tell you if one of the required node libraries is not installed.

  5. Open up two different browsers on your computer, one in Chrome and the other in Firefox. Go to https://example.com/client.htm (change "example.com" to your URL) in both. Type your name in the name box and type text in the textbox in one of the browsers then press "enter". Your text should appear in both browsers. Put on a headphone. Click the play button in the audio control at the top of the chat in both browsers. Click the recordbutton on one browser and start speaking into your microphone. You should hear your own live voice come through the other browser with a .2 second delay.

CLIENT

The following are *not* bugs:

  1. The very first time you try to speak in a chat on this page, you will be asked to give this page permission to use your computer's microphone. (Modern browers don't let webpages record you without your permission.) During the first time, a cookie will be recorded so that you won't have to give permission the next time.

  2. Each time you enter a chat, you won't be able to hear any live conversation until you have clicked the play button on a recording on the chat page. You can click to play any of the recordings. That's why there is a short silent sound file in html5 audio controls at the very top of the page.  (Modern browsers don't let webpages make noise until you click a play button.)

  3. If you only have the chat room open in one browser on your computer, you won't hear your own voice while you are speaking, because that could cause feedback. But if everything is working right, you should hear other voices live when they are speaking.

The following buttons are available at the bottom of the chat window:

  1. Record Button. Clicking the solid circle turns your microphone on and changes this button into Stop Recording Button. This is a "walky-talky" chat: You click to turn your microphone on just before you speak and turn your microphone off when you are done.

  2. Stop Recording Button. Clicking the solid square turns your microphone off and changes this button into a Record Button. Also, if someone else turns on their microphone when your microphone is on, your microphone goes off and this button changes into Record Button. 

  3. Disconnect. Clicking this button (or closing the chat window) causes you to leave the chat. Pressing F5 (or reopening the window) gets you back into the chat.

The voice chat features do not work in all browsers. For example, you can't hear people speaking live in Safari at its default settings, but all of the features work in both Chrome and Firefox at their default settings. If your browser doesn't allow you to speak or listen to the live voice, it will still allow you to participate by posting text and by listening to immediately posted recordings of the live voices. Here is how the voice chat features of the client work:

The voice data comes off the microphone as a Float32 buffer which gets sent to the worker file through the following commands:

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  var constraints = 
  {
     audio: true,
     video: false
   };
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream)
  {
    audioContext = new AudioContext();
    var audioInput = audioContext.createMediaStreamSource(stream);
    var bufferSize = 4096;
    var config = { bufferLen: bufferSize, numChannels: 1, mimeType: 'audio/wav' };
    var recorder = (audioContext.createScriptProcessor || audioContext.createJavaScriptNode).call(audioContext, config.bufferLen, config.numChannels, config.numChannels);
    audioInput.connect(recorder);
    recorder.connect(audioContext.destination); 
    recorder.onaudioprocess = recorderProcess;
  }).catch(function(err) 
  {
	console.log("error %s", err);
  });

  function recorderProcess(e) 
  {
    var left = e.inputBuffer.getChannelData(0);
    worker.postMessage ( left );
  }

The voice data is received back from the web worker as a wav blob and then is sent to the server using the following command:

  worker.onmessage = function(event)
  {
    webSocket.send( event.data );
  }

The voice data is received from the websocket server as a wav blob and is sent to the speaker using the following code:

function processSpeakerData(data)
{
  if (count == 0)
  {
    startTime = ctx.currentTime;
  }
  ctx.decodeAudioData(data, function(buffer)
  {
     count++;
     var playTime = startTime + .2 + (count * 0.0928798);
     playBlob(buffer, playTime);
  },
  function(e)
  {
  console.log("Error with decoding audio data" + e.err);
  });
}

function playBlob(buffer, playTime)
{
  var source = ctx.createBufferSource(); //Create a new source node for each blob
  source.buffer = buffer; // Put the blob into the source node's buffer
  source.connect(ctx.destination); // Connect the source to the speakers
  source.start(playTime); // Set the starting time of the sample to the scheduled play time
}

WEB WORKER

The web worker contains a single function which receives a floating point buffer of length 4096 from the main thread and converts the info in the buffer to a wav blob in integer array format. First it converts the floating point data into int16 data. Then it adds in a 44 byte wav file header. It then sends the resulting buffer back to the main thread. Here's the complete file:

  self.onmessage= function (e) 
  {
    var l = 4096;
    var wavHeader ="524946462420000057415645666d7420100000000100010044ac000088580100020010006461746100200000";
    var i16 = new Int16Array(l);
    while (l--) 
    {
      i16[l] = Math.min(1, e.data[l])*0x7FFF;
    }
    var uint8array = new Uint8Array(8236);
    for (var i = 0; i < 44; i++)
    {
      uint8array[i] = parseInt(wavHeader.substr(i*2,2), 16);
    }
    var srcU8 = new Uint8Array(i16.buffer, 0, 8192);
    uint8array.set(srcU8, 44);
    var ab = uint8array.buffer;
    postMessage (ab);
  }

SERVER

The node server uses ws: a Node.js WebSocket library (https://www.npmjs.com/package/ws). This is a very simple websocket server which doesn't have built-in support for streams. 

The server immediately sends the wav blob back to all the clients (except for the client from whom the blob came) through the following commands:

  	if (Buffer.isBuffer(message))
	{
	   var msg = new Uint8Array(message);
	   wss.clients.forEach(function (client) 
	   {
		 if (client !==ws && client.readyState == WebSocket.OPEN) 
		 {
            client.send( msg );
		 }
	   });
	}

It also adds the wav blob into a wav file that will be saved to the server's disk through the following three code snippets:

1. This snippet imports the required node library for compiling a wav file:

  const wav = require('wav');

2. This snippet initializes a new wav file. If the audioNum is 1, the file will be called "1.wav" and will appear in the same directory as your server file. 

  fileWriter = new wav.FileWriter(audioNum + '.wav' , 
  {
    channels: 1,
    sampleRate: 44100,
    bitDepth: 16						
  });

This command strips off the 44 byte wav header from the blob and writes the buffer of the remainder to the wav file:

  fileWriter.write(Buffer.from(msg.subarray(44)));

ACKNOWLEDGMENTS

The basic structure of the websocket client comes from Peter Thoeny's post, "How to Create a Chat Application with a WebSocket": https://twiki.org/cgi-bin/view/Blog/BlogEntry201604x1

The parts of the client that record the input from the microphone owe much to two closely related contributions: 
1. Matt Diamond's recorder.js: https://github.com/mattdiamond/Recorderjs
2. Gabriel Poca's tutorial, "HTML Capture streaming to Node.js (no browser extensions)": https://gabrielpoca.com/2014-06-24-streaming-microphone-from-browser-to-nodejs-no-plugin/

The parts of the client that send data to speakers owe much to Sam Manchin's "Streaming Calls to a Browser with Voice Websockets": https://www.nexmo.com/blog/2016/12/19/streaming-calls-to-a-browser-with-voice-websockets-dr

The ws server borrows heavily from the documentation that accompanied "ws: a Node.js WebSocket library": https://www.npmjs.com/package/ws

Don't confuse me with a JavaScript expert. I have been programming in Fortran, Basic, IPL-V, LISP, C, Perl, and Java for about 50 years but am new to Javascript. The odd way I line up parentheses is due to the way I learned to do it in LISP. Any suggestions that you have for improving the code will be appreciated. Email them to Howard Richman: drhbr1950@gmail.com. 

Howard Richman
