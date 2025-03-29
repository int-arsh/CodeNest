import os
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'fallback_secret_key')

# Configure CORS - Allow requests from your Next.js frontend
CORS(app, resources={r"/*": {"origins": "*"}}) # Allows all origins for development

# Initialize SocketIO with eventlet async mode
# Make sure you installed eventlet: pip install eventlet
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# In-memory storage for room code (replace with DB for persistence)
room_code_store = {}

@app.route('/')
def index():
    return jsonify({"message": "Collaborative Editor Backend Running with Eventlet"})

# --- SocketIO Event Handlers --- (Identical to previous example)

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    # Potential cleanup needed

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('roomId')
    if not room_id:
        print(f"Error: No roomId provided by {request.sid}")
        emit('error', {'message': 'Room ID is required.'}, room=request.sid)
        return
    try:
        join_room(room_id)
        print(f"Client {request.sid} joined room {room_id}")
        current_code = room_code_store.get(room_id, f'# Welcome to room: {room_id} (Eventlet Backend)\n\nprint("Hello from Eventlet!")')
        emit('initial_code', {'code': current_code}, room=request.sid)
    except Exception as e:
        print(f"Error joining room {room_id} for {request.sid}: {e}")
        emit('error', {'message': f'Could not join room {room_id}.'}, room=request.sid)

@socketio.on('code_change')
def handle_code_change(data):
    room_id = data.get('roomId')
    new_code = data.get('code')
    if room_id is None or new_code is None:
         print(f"Error: Missing roomId or code from {request.sid}")
         return
    room_code_store[room_id] = new_code
    socketio.emit('code_update', {'code': new_code}, to=room_id, include_self=False)

@socketio.on('leave_room')
def handle_leave_room(data):
    room_id = data.get('roomId')
    if not room_id:
        print(f"Error: No roomId provided for leaving by {request.sid}")
        return
    try:
        leave_room(room_id)
        print(f"Client {request.sid} left room {room_id}")
    except Exception as e:
        print(f"Error leaving room {room_id} for {request.sid}: {e}")

if __name__ == '__main__':
    print("Starting Flask-SocketIO server with Eventlet...")
    # Use host='0.0.0.0' to make it accessible on your local network
    socketio.run(app, debug=True, host='0.0.0.0', port=5001)