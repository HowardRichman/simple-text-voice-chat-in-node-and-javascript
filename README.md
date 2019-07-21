# simple-text-voice-chat-in-node-and-javascript
This voice/text chat uses a Node websocket (ws) server, an html and javscript client and a javascript web worker. It consists of four files:

  1. client.htm. The client file which is written in html5 and javascript.

  2. server.js. A Node websocket (https://www.npmjs.com/package/ws) server file.

  3. worker.js. A short javascript web worker file with a single function. 

  4. silence.mp3. A short sound file that plays about a second of silence.

INSTALLING THE CHAT

In order to get these files running on your website, just put them into the public root directory after doing the following:

  1. In the client file, change "example.com" to your website.

  2. In the server file, change the paths of the secure certificate (cert:) and key (key:) to those on your server. You should be able find those paths in your server's httpd.conf file. 

  3. If not already installed, install Node.js and each of the required Node packages (fs, https, ws, moment, wav and path) on your server so that they can be accessed from your public root directory. 
  
TRYING OUT THE CHAT

  1. Start the server. Use putty or telnet to go to the directory where the server.js file can be found and then type:

		node server.js

  		Press enter and look for error messages which would tell you if a required Node package is not installed.

  2. Open up two different browsers on your computer, one in Chrome and the other in Firefox. Go to https://example.com/client.htm (change "example.com" to your website) in both. (Other people can enter the chat at the same time on their computers by going to the same URL.) 
  
  3. Type your name in the name box and type text in the textbox in one of the browsers then press the "Enter" key on your keyboard. Your text should appear in both browsers. 
  
  4. Put on a headphone. Click the play button in the audio control at the top of the chat in both browsers. Click the Record Button in the first browser and start speaking into your microphone. You should hear your own live voice come through the second browser with a 0.2 second delay. Meanwhile, the Record Button in the first browser should change into a Stop-Recording Button. 
  
  5. Reply by clicking the Record Button in the second browser. You should hear your own live voice come through in the first browser, and the Stop-Recording Button in the first browser will change to a Record Button. 
  
  6. Click the Stop-Recording Button in the second browser. An audio control with a link to the wav file of the conversation will pop up in both browsers. You can click on the play button within that audio control to listen to the conversation again. 

CLIENT

The following are *not* bugs:

  1. The very first time you try to speak in a chat on this page, you will be asked to give this page permission to use your computer's microphone. (Modern browers don't let webpages record you without your permission.) During the first time, a cookie will be recorded so that you won't have to give permission the next time.

  2. Each time you enter a chat, you won't be able to hear any live conversation until you have clicked the play button on a recording on the chat page. That's why there is a short silent sound file in html5 audio controls at the very top of the page.  (Modern browsers don't let webpages make noise until you click a play button.)

  3. If you only have the chat room open in one browser on your computer, you won't hear your own voice while you are speaking, because that could cause feedback. But if everything is working right, you should hear other voices live when they are speaking.

The following buttons are available at the bottom of the chat window:

  1. Record Button. Clicking the solid circle turns your microphone on and changes this button into a Stop-Recording Button. This is a "walky-talky" chat: You click to turn your microphone on just before you speak and click to turn your microphone off when you are done.

  2. Stop-Recording Button. Clicking the solid square turns your microphone off and changes this button into a Record Button. Also, if someone else turns on their microphone when your microphone is on, your microphone goes off and this button changes into a Record Button. 

  3. Disconnect. Clicking this button (or closing the chat window) causes you to leave the chat. Pressing F5 (or reopening the window) gets you back into the chat.

The voice chat features do not work in all browsers. But all of the features work in both Chrome and Firefox at their default settings. If clients' browsers don't allow them to speak or listen to the live voice, it should still allow them to participate by posting text and by listening to immediately posted recordings of the live voices. If they can't hear the posted recordings, then their browswers don't support wav format. There is commented out code in the server and the client which could solve this problem, but you would first have to install Lame (http://lame.sourceforge.net/) on the server's website to get the commented out lines to work. Here is how the voice chat features of the client work:

After you press the Record Button, your voice data comes off the left channel of your microphone in 4096 byte floating-point buffers. Each buffer gets sent to the worker file through the following commands:

	const AudioContext = window.AudioContext || window.webkitAudioContext;

  	var constraints = 
  	{
    	audio:true,     
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

The info from the buffer is received back from the web worker in the form of a wav blob and then is sent to the server using the following command:

  	worker.onmessage = function(event)  
  	{  
    	webSocket.send( event.data );    
  	}

When someone else speaks, voice data is received from the websocket server as wav blobs. Each individual blob is sent to the speaker using the following code:

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
  		},  function(e)
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

The web worker contains a single function which receives a floating point buffer of length 4096 from the main thread and converts the info of the buffer to a wav blob in integer array format. First it converts the floating point data into int16 data. Then it adds in a 44 byte wav file header. It then sends the resulting buffer back to the main thread. Here's the complete file:

	self.onmessage= function (e) 
	{
		// The 44 byte wav header of a 4096 byte mono wav file should look like this:
		// 52 49 46 46 24 20 00 00 57 41 56 45 66 6d 74 20 10 00 00 00 01 00 01 00 44 ac 00 00 88 58 01 00 02 00 10 00 64 61 74 61 00 20 00 00
		var l = 4096;
		var i16 = new Int16Array(4118);
		while (l--) 
		{
			i16[l+22] = Math.min(1, e.data[l])*0x7FFF;
		}
		i16[21] = 0x0000;
		i16[20] = 0x2000;
		i16[19] = 0x6174;
		i16[18] = 0x6164;
		i16[17] = 0x0010;
		i16[16] = 0x0002;
		i16[15] = 0x0001;
		i16[14] = 0x5888;
		i16[13] = 0x0000;
		i16[12] = 0xac44;
		i16[11] = 0x0001;
		i16[10] = 0x0001;
		i16[9] = 0x0000;
		i16[8] = 0x0010;
		i16[7] = 0x2074;
		i16[6] = 0x6d66;
		i16[5] = 0x4556;
		i16[4] = 0x4157;
		i16[3] = 0x0000;
		i16[2] = 0x2024;
		i16[1] = 0x4646;
 		i16[0] = 0x4952;
		var ab = i16.buffer;
		postMessage (ab);
	}

SERVER

The Node server uses "ws: a Node.js WebSocket library": (https://www.npmjs.com/package/ws). This is a very simple and fast websocket server that doesn't have built-in support for streams. Upon receipt of each wav blob from a client, the server sends it to all the connected clients, except for the client from whom the blob came, through the following commands:

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

Until a Stop-Recording button is pressed in a client, the server compiles incoming wav blobs into a wav file on the server's disk through the following three code snippets:

1. This command imports the required Node package for compiling a wav file:

	const wav = require('wav');

2. This code snippet initializes a new wav file. If the audioNum is 1, the file will be called "1.wav" and will appear in the public route directory of your server. 

	fileWriter = new wav.FileWriter(audioNum + '.wav' , 
  	{
    	channels: 1, 
    	sampleRate: 44100,
    	bitDepth: 16
  	});

This command writes a wav blob (after stripping off its 44 byte wav header) into the wav file that is being compiled:

	fileWriter.write(Buffer.from(msg.subarray(44)));

ACKNOWLEDGMENTS

The basic structure of the websocket client comes from Peter Thoeny's post, "How to Create a Chat Application with a WebSocket": https://twiki.org/cgi-bin/view/Blog/BlogEntry201604x1

The parts of the client that record the input from the microphone owe much to two closely related contributions: 
1. Matt Diamond's recorder.js: https://github.com/mattdiamond/Recorderjs
2. Gabriel Poca's tutorial, "HTML Capture streaming to Node.js (no browser extensions)": https://gabrielpoca.com/2014-06-24-streaming-microphone-from-browser-to-nodejs-no-plugin/

The parts of the client that send data to speakers owe much to Sam Manchin's "Streaming Calls to a Browser with Voice Websockets": https://www.nexmo.com/blog/2016/12/19/streaming-calls-to-a-browser-with-voice-websockets-dr

The ws server borrows heavily from the documentation that accompanied Luigi Pinca's "ws: a Node.js WebSocket library": https://www.npmjs.com/package/ws

I have been programming in Fortran, Basic, IPL-V, LISP, C, Perl, and Java for about 50 years but am new to Javascript. The odd way I line up parentheses is due to the way I learned to do it in LISP. Any suggestions that you have for improving the code will be appreciated. Email them to me (drhbr1950@gmail.com). 

Howard Richman
