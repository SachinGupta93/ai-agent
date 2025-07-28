# real_executor.py - Actually executes commands instead of just talking
import subprocess
import webbrowser
import os
import time
import pyautogui
import psutil
from typing import Dict, Any

class RealExecutor:
    def __init__(self):
        # Enable pyautogui failsafe
        pyautogui.FAILSAFE = True
        
    def execute_command(self, user_input: str) -> str:
        """Actually execute the command"""
        input_lower = user_input.lower()
        
        try:
            # Browser operations
            if "open chrome" in input_lower:
                return self.open_chrome()
            elif "open firefox" in input_lower:
                return self.open_firefox()
            elif "open browser" in input_lower:
                return self.open_browser()
            
            # Search operations
            elif "search" in input_lower and ("linkedin" in input_lower or "google" in input_lower or "youtube" in input_lower):
                return self.search_web(user_input)
            
            # File operations
            elif "create file" in input_lower:
                return self.create_file(user_input)
            elif "open file" in input_lower:
                return self.open_file(user_input)
            
            # System operations
            elif "open calculator" in input_lower:
                return self.open_calculator()
            elif "open notepad" in input_lower:
                return self.open_notepad()
            elif "take screenshot" in input_lower:
                return self.take_screenshot()
            
            # Process operations
            elif "close" in input_lower and ("chrome" in input_lower or "firefox" in input_lower):
                return self.close_application(user_input)
            
            # System commands
            elif user_input.startswith("run "):
                command = user_input[4:]
                return self.run_system_command(command)
            
            else:
                return f"❌ Command not recognized: {user_input}"
                
        except Exception as e:
            return f"❌ Execution failed: {str(e)}"
    
    def open_chrome(self) -> str:
        """Actually open Chrome browser"""
        try:
            if os.name == 'nt':  # Windows
                subprocess.Popen(['chrome'])
            elif os.name == 'posix':  # macOS/Linux
                subprocess.Popen(['google-chrome'])
            
            time.sleep(2)  # Wait for Chrome to open
            return "✅ Chrome browser opened successfully"
        except:
            # Fallback to webbrowser
            webbrowser.open('https://www.google.com')
            return "✅ Browser opened (fallback method)"
    
    def open_firefox(self) -> str:
        """Actually open Firefox browser"""
        try:
            if os.name == 'nt':  # Windows
                subprocess.Popen(['firefox'])
            else:  # macOS/Linux
                subprocess.Popen(['firefox'])
            
            time.sleep(2)
            return "✅ Firefox browser opened successfully"
        except:
            webbrowser.open('https://www.google.com')
            return "✅ Browser opened (fallback method)"
    
    def open_browser(self) -> str:
        """Open default browser"""
        webbrowser.open('https://www.google.com')
        return "✅ Default browser opened"
    
    def search_web(self, user_input: str) -> str:
        """Actually perform web search"""
        input_lower = user_input.lower()
        
        if "linkedin" in input_lower:
            webbrowser.open('https://www.linkedin.com')
            return "✅ LinkedIn opened in browser"
        elif "google" in input_lower:
            # Extract search query
            if "search" in input_lower:
                query = user_input.split("search")[-1].strip()
                if query:
                    search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
                    webbrowser.open(search_url)
                    return f"✅ Google search opened for: {query}"
            webbrowser.open('https://www.google.com')
            return "✅ Google opened in browser"
        elif "youtube" in input_lower:
            webbrowser.open('https://www.youtube.com')
            return "✅ YouTube opened in browser"
        else:
            # Generic search
            query = user_input.replace("search", "").strip()
            search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
            webbrowser.open(search_url)
            return f"✅ Web search opened for: {query}"
    
    def create_file(self, user_input: str) -> str:
        """Actually create a file"""
        try:
            # Extract filename
            words = user_input.split()
            filename = "new_file.txt"
            
            for i, word in enumerate(words):
                if "." in word:
                    filename = word
                    break
                elif word == "file" and i + 1 < len(words):
                    filename = words[i + 1]
                    if "." not in filename:
                        filename += ".txt"
                    break
            
            # Create the file
            with open(filename, 'w') as f:
                f.write(f"File created by AI Agent at {time.ctime()}\n")
            
            return f"✅ File created: {filename}"
        except Exception as e:
            return f"❌ File creation failed: {str(e)}"
    
    def open_file(self, user_input: str) -> str:
        """Actually open a file"""
        try:
            # Extract filename
            words = user_input.split()
            filename = None
            
            for word in words:
                if "." in word:
                    filename = word
                    break
            
            if not filename:
                return "❌ No filename specified"
            
            if os.name == 'nt':  # Windows
                os.startfile(filename)
            else:  # macOS/Linux
                subprocess.call(['open', filename])
            
            return f"✅ File opened: {filename}"
        except Exception as e:
            return f"❌ File open failed: {str(e)}"
    
    def open_calculator(self) -> str:
        """Actually open calculator"""
        try:
            if os.name == 'nt':  # Windows
                subprocess.Popen(['calc'])
            else:  # macOS/Linux
                subprocess.Popen(['gnome-calculator'])
            
            return "✅ Calculator opened"
        except Exception as e:
            return f"❌ Calculator open failed: {str(e)}"
    
    def open_notepad(self) -> str:
        """Actually open notepad"""
        try:
            if os.name == 'nt':  # Windows
                subprocess.Popen(['notepad'])
            else:  # macOS/Linux
                subprocess.Popen(['gedit'])
            
            return "✅ Notepad opened"
        except Exception as e:
            return f"❌ Notepad open failed: {str(e)}"
    
    def take_screenshot(self) -> str:
        """Actually take a screenshot"""
        try:
            screenshot = pyautogui.screenshot()
            filename = f"screenshot_{int(time.time())}.png"
            screenshot.save(filename)
            return f"✅ Screenshot saved: {filename}"
        except Exception as e:
            return f"❌ Screenshot failed: {str(e)}"
    
    def close_application(self, user_input: str) -> str:
        """Actually close an application"""
        try:
            input_lower = user_input.lower()
            
            if "chrome" in input_lower:
                app_name = "chrome.exe" if os.name == 'nt' else "chrome"
            elif "firefox" in input_lower:
                app_name = "firefox.exe" if os.name == 'nt' else "firefox"
            else:
                return "❌ Application not specified"
            
            # Find and kill the process
            killed = False
            for proc in psutil.process_iter(['pid', 'name']):
                if app_name.lower() in proc.info['name'].lower():
                    proc.kill()
                    killed = True
            
            if killed:
                return f"✅ {app_name} closed successfully"
            else:
                return f"❌ {app_name} not found running"
                
        except Exception as e:
            return f"❌ Close application failed: {str(e)}"
    
    def run_system_command(self, command: str) -> str:
        """Actually run system command"""
        try:
            # Safety check
            dangerous = ['rm -rf', 'del /f', 'format', 'shutdown', 'reboot', 'sudo rm']
            if any(danger in command.lower() for danger in dangerous):
                return "❌ Dangerous command blocked for safety"
            
            result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                output = result.stdout if result.stdout else "Command executed successfully"
                return f"✅ Command executed:\n{output}"
            else:
                return f"❌ Command failed:\n{result.stderr}"
                
        except subprocess.TimeoutExpired:
            return "❌ Command timed out"
        except Exception as e:
            return f"❌ Command execution failed: {str(e)}"

# Test the executor
if __name__ == "__main__":
    executor = RealExecutor()
    
    # Test commands
    test_commands = [
        "open chrome",
        "search linkedin",
        "create file test.txt",
        "take screenshot",
        "open calculator"
    ]
    
    print("🧪 Testing Real Executor:")
    for cmd in test_commands:
        print(f"\n💻 Command: {cmd}")
        result = executor.execute_command(cmd)
        print(f"📋 Result: {result}")
        time.sleep(1)