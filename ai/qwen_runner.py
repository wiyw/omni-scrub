#!/usr/bin/env python3
"""
Qwen LLM Runner for Omni-Scrub
Handles AI reasoning and chat queries
"""

import sys
import json
import time

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError as e:
    TRANSFORMERS_AVAILABLE = False
    print(json.dumps({"type": "status", "message": f"Transformers not available: {e}"}), flush=True)

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"
MAX_LENGTH = 512

class QwenRunner:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.ready = False
        self.conversation_history = []
        
    def load_model(self):
        if not TRANSFORMERS_AVAILABLE:
            return False
            
        try:
            print(json.dumps({"type": "status", "message": "Loading Qwen2.5-0.5B model..."}), flush=True)
            
            self.tokenizer = AutoTokenizer.from_pretrained(
                MODEL_NAME, 
                trust_remote_code=True
            )
            
            self.model = AutoModelForCausalLM.from_pretrained(
                MODEL_NAME,
                torch_dtype=torch.float32,
                device_map="auto",
                trust_remote_code=True
            )
            
            self.ready = True
            print(json.dumps({"type": "status", "message": "Qwen model ready"}), flush=True)
            print("READY", flush=True)
            return True
            
        except Exception as e:
            print(json.dumps({"type": "status", "message": f"Model load error: {e}"}), flush=True)
            return False
    
    def generate_response(self, user_input: str) -> str:
        if not self.ready or not self.model or not self.tokenizer:
            return "AI not ready. Please wait..."
        
        try:
            self.conversation_history.append({
                "role": "user", 
                "content": user_input
            })
            
            messages = [
                {"role": "system", "content": "You are Omni-Scrub, an AI assistant for an autonomous floor cleaning robot. You help with navigation decisions, object recognition, and robot control. Be concise and helpful."}
            ]
            messages.extend(self.conversation_history[-6:])
            
            text = self.tokenizer.apply_chat_template(
                messages, 
                tokenize=False, 
                add_generation_prompt=True
            )
            
            inputs = self.tokenizer([text], return_tensors="pt").to(self.model.device)
            
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=150,
                temperature=0.7,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
            
            response = self.tokenizer.decode(
                outputs[0][inputs.input_ids.shape[1]:], 
                skip_special_tokens=True
            )
            
            self.conversation_history.append({
                "role": "assistant", 
                "content": response
            })
            
            if len(self.conversation_history) > 10:
                self.conversation_history = self.conversation_history[-10:]
            
            return response.strip()
            
        except Exception as e:
            return f"Error: {str(e)}"
    
    def run(self):
        if not TRANSFORMERS_AVAILABLE:
            print(json.dumps({"type": "status", "message": "Transformers not available, using fallback mode"}), flush=True)
            print("READY", flush=True)
            while True:
                line = sys.stdin.readline()
                if not line:
                    break
                query = line.strip()
                if query:
                    if "hello" in query.lower() or "hi" in query.lower():
                        print("Hello! I'm Omni-Scrub AI. How can I help you today?", flush=True)
                    elif "clean" in query.lower() or "floor" in query.lower():
                        print("I'm ready to help with cleaning tasks. I can detect obstacles and navigate around them.", flush=True)
                    else:
                        print(f"I understand you said: '{query}'. I'm here to help with robot navigation and object detection.", flush=True)
            return
            
        if not self.load_model():
            print(json.dumps({"type": "status", "message": "Failed to load model, using fallback mode"}), flush=True)
            print("READY", flush=True)
            while True:
                line = sys.stdin.readline()
                if not line:
                    break
                query = line.strip()
                if query:
                    print(f"AI (fallback): I received your message about '{query}'. The AI model is not loaded.", flush=True)
            return
        
        print(json.dumps({"type": "status", "message": "Waiting for queries..."}), flush=True)
        
        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break
                    
                query = line.strip()
                if not query:
                    continue
                
                response = self.generate_response(query)
                print(json.dumps({
                    "type": "response", 
                    "query": query, 
                    "response": response
                }), flush=True)
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(json.dumps({"type": "status", "message": f"Error: {e}"}), flush=True)

if __name__ == "__main__":
    runner = QwenRunner()
    runner.run()
