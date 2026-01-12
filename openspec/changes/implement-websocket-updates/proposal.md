# Change: WebSocket Real-time Updates

## Why
Users need real-time feedback during extraction jobs. WebSocket enables live progress updates without polling.

## What Changes
- Create WebSocket gateway in NestJS
- Implement subscription to manifest updates
- Emit job progress events from BullMQ processor
- Create WebSocket client hook in Next.js
- Display progress indicators in UI
- Show real-time status changes

## Impact
- Affected specs: New realtime capability
- Affected code: New websocket module, frontend hooks
