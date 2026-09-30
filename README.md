# Homebase — Smart Home Control Dashboard (MERN)
**Features:** device management, real-time status (Socket.IO), scheduling
**Advanced:** IoT simulation, notifications, energy usage analytics

## Run
Requires Node 18+ and MongoDB.
```
cd server && cp .env.example .env && npm i && npm run dev
cd client && npm i && npm run dev        # http://localhost:5173
```
No seed step: sign up in the app and your account gets 7 demo devices and 7 days of sample usage.

## Demo flow
1. Open the app in two browser windows with the same login. Toggle a device in one; the other updates instantly.
2. Dashboard: press "Motion" / "Heat spike" to trigger simulated sensor events. A toast pops up and the Alerts badge increases.
3. Schedules: add "turn on Ceiling Fan" for one minute from now. The server runs it and sends a notification.
4. Energy: usage grows while devices are on (SIM_SPEED in .env makes 5 real seconds count as 5 minutes).

## How the IoT simulation works
`server/simulator.js` acts as the hardware: every 5 seconds it drifts the temperature sensor, logs kWh for every device that is on, and pushes live power over Socket.IO.
To use real devices later, replace this loop with an MQTT subscriber that writes the same updates.
Schedules use the server's local time.
