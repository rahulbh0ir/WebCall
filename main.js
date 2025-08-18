
    const socket = new WebSocket("ws://localhost:3000");


    let pc = null;
    let room = null;
    let localStream;

    const localVideo = document.getElementById("localVideo");
    const remoteVideo = document.getElementById("remoteVideo");
    

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

    };




    // Send messages to the server

    function send(type, payload) {
      socket.send(JSON.stringify({ type, room, payload }));
    }



    // Create or Join a Room

    async function joinRoom() {
      
      room = document.getElementById("roomInput").value.trim();
      
      if (!room) return alert("Enter a room name");
      
      document.getElementById("video").style.display = "grid";

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

      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      localVideo.srcObject = localStream;

    }




    // Adding functionality to join room on Enter key press

   document.getElementById("roomInput").addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        joinRoom();
      }
    })




    