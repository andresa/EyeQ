#!/usr/bin/osascript
-- EyeQ Development Script
-- Opens two iTerm panes: one for Vite (frontend) and one for Azure Functions (API)

on run argv
  set projectPath to "/Users/andresa/Dev/eyeq"
  
  -- Kill any processes on ports 5173 and 7071 before starting
  do shell script "lsof -ti:5173 | xargs kill -9 2>/dev/null || true"
  do shell script "lsof -ti:7071 | xargs kill -9 2>/dev/null || true"
  
  tell application "iTerm"
    activate
    
    -- Create a new tab or use current window
    tell current window
      -- Split the current session horizontally
      tell current session
        split horizontally with default profile
      end tell
      
      -- Second pane: Azure Functions API (build first, then start)
      tell second session of current tab
        write text "cd " & projectPath & "/api && npm run build && func start"
      end tell
      
      -- First pane: Vite frontend (with delay to let API start)
      tell first session of current tab
        write text "cd " & projectPath & " && sleep 5 && npm run dev:ui"
      end tell
    end tell
  end tell
end run
