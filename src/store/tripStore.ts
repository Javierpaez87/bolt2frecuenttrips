10:36:29 PM: x Build failed in 473ms
10:36:29 PM: error during build:
10:36:29 PM: [vite:esbuild] Transform failed with 1 error:
10:36:29 PM: /opt/build/repo/src/pages/CreateTrip.tsx:1:6: ERROR: Expected ";" but found "{"
10:36:29 PM: file: /opt/build/repo/src/pages/CreateTrip.tsx:1:6
10:36:29 PM: 
10:36:29 PM: Expected ";" but found "{"
10:36:29 PM: 1  |  mport { toast } from 'react-toastify';
10:36:29 PM:    |        ^
10:36:29 PM: 2  |  import React, { useEffect, useState } from 'react';
10:36:29 PM: 3  |  import { useNavigate } from 'react-router-dom';
10:36:29 PM: 
10:36:29 PM:     at failureErrorWithLog (/opt/build/repo/node_modules/esbuild/lib/main.js:1472:15)
10:36:29 PM:     at /opt/build/repo/node_modules/esbuild/lib/main.js:755:50
10:36:29 PM:     at responseCallbacks.<computed> (/opt/build/repo/node_modules/esbuild/lib/main.js:622:9)
10:36:29 PM:     at handleIncomingPacket (/opt/build/repo/node_modules/esbuild/lib/main.js:677:12)
10:36:29 PM:     at Socket.readFromStdout (/opt/build/repo/node_modules/esbuild/lib/main.js:600:7)
10:36:29 PM:     at Socket.emit (node:events:518:28)
10:36:29 PM:     at addChunk (node:internal/streams/readable:561:12)
10:36:29 PM:     at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
10:36:29 PM:     at Readable.push (node:internal/streams/readable:392:5)
10:36:29 PM:     at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)
10:36:29 PM: ​
10:36:29 PM: "build.command" failed                                        
10:36:29 PM: ────────────────────────────────────────────────────────────────
10:36:29 PM: ​
10:36:29 PM:   Error message
10:36:29 PM:   Command failed with exit code 1: npm run build (https://ntl.fyi/exit-code-1)
10:36:29 PM: ​
10:36:29 PM:   Error location
10:36:29 PM:   In Build command from Netlify app:
10:36:29 PM:   npm run build
10:36:29 PM: ​
10:36:29 PM:   Resolved config
10:36:29 PM:   build:
10:36:29 PM:     command: npm run build
10:36:29 PM:     commandOrigin: ui
10:36:29 PM:     publish: /opt/build/repo/dist
10:36:29 PM:     publishOrigin: ui
10:36:30 PM: Failed during stage 'building site': Build script returned non-zero exit code: 2 (https://ntl.fyi/exit-code-2)
10:36:30 PM: Build failed due to a user error: Build script returned non-zero exit code: 2
10:36:30 PM: Failing build: Failed to build site
10:36:30 PM: Finished processing build request in 19.181s