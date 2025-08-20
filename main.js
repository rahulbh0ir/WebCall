
    const socket = new WebSocket("ws://localhost:3000");


    let pc = null;
    let room = null;
    let localStream;

    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");
    let roominfo = document.getElementById("info");
    

    const config = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    };
    



    // Listen for Incoming Messages

    socket.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "welcome") {
        console.log("Connected. My ID:", msg.id);
      } 
      else if (msg.type === "offer") {
        await createPeerConnection();
        
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
       
        send("answer", pc.localDescription);

      } 
      else if (msg.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
      } 
      else if (msg.type === "ice-candidate") {
        if (msg.payload) {
          await pc.addIceCandidate(msg.payload);
        }
      } 
      else if (msg.type === "leave") {
        console.log(`Client ${msg.from} left the room.`);
      }  

    }




    // Send messages to the server

    function send(type, payload) {
      socket.send(JSON.stringify({ type, room, payload }));
    }



    // Create or Join a Room

    async function joinRoom() {
      
      room = document.getElementById("roomInput").value.trim();
      
      if (!room) return alert("Enter a room name");
      
      document.getElementById("video").style.display = "grid";
      roominfo.style.display = "none";
      
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
      
      socket.send(JSON.stringify({ type: "join", room }));

      await createPeerConnection();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      send("offer", pc.localDescription);
      
    }

    
    
    // Create Peer Connection on both ends

    async function createPeerConnection() {
      
      if (pc) return;
      
      
      pc = new RTCPeerConnection(config);


      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send("ice-candidate", event.candidate);
        }
      };

      pc.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
      };

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    }


    function toggleMic() {
      const micButton = document.getElementById("mic");
      const audioTrack = localStream.getAudioTracks()[0];
      
      if (audioTrack.enabled) {
        audioTrack.enabled = false;
        micButton.style.backgroundColor = "tomato";
        micButton.src = "./icons/mic-off.png";
      } else {
        audioTrack.enabled = true;
        micButton.style.backgroundColor = "transparent";
        micButton.src = "./icons/mic.png";
      }
    }

    function toggleVideo() {
      const videoButton = document.getElementById("camera");
      const videoTrack = localStream.getVideoTracks()[0];
      
      if (videoTrack.enabled) {
        videoTrack.enabled = false;
        videoButton.style.backgroundColor = "tomato";
        videoButton.src = "./icons/video-off.png";
      } else {
        videoTrack.enabled = true;
        videoButton.style.backgroundColor = "transparent";
        videoButton.src = "./icons/video.png";
      }
    }


    function hangup() {
      if (pc) {
        pc.close();
        pc = null;
      }
      localStream.getTracks().forEach(track => track.stop());
      localVideo.srcObject = null;
      remoteVideo.srcObject = null;

      roominfo.style.display = "block";
      document.getElementById("video").style.display = "none";
      
      socket.send(JSON.stringify({ type: "leave", room }));
    
    } 




    // Adding functionality to join room on Enter key press

   document.getElementById("roomInput").addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        joinRoom();
      }
    })




    