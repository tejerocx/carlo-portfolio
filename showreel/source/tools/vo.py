import json, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("voices/kokoro-v1.0.onnx", "voices/voices-v1.0.bin")
V = "af_bella"
lines = [
 ("l1", "Your court!", 1.1),
 ("l2", "Your time!", 1.1),
 ("l3", "Zero hassle.", 1.1),
 ("l4", "Introducing Smash Grove. The fastest way to book at Bambulo Pickleyard!", 1.18),
 ("l5", "Step one. Pick your court. Premium floors, open air.", 1.2),
 ("l6", "Step two. Choose your time, with live slots.", 1.2),
 ("l7", "Step three. Drop in your details, in seconds.", 1.2),
 ("l8a", "Step four. Lock in your downpayment,", 1.2),
 ("l8b", "and boom! You're confirmed!", 1.15),
 ("l9a", "No calls!", 1.1),
 ("l9b", "No waiting!", 1.1),
 ("l9c", "Just play!", 1.05),
 ("l10", "Scan the code, and book your court today. Smash Grove!", 1.15),
]
import os; os.makedirs("vo", exist_ok=True)
d = {}
for n, t, s in lines:
    a, sr = k.create(t, voice=V, speed=s, lang="en-us")
    sf.write(f"vo/{n}.wav", a, sr); d[n] = round(len(a)/sr, 3)
print(json.dumps(d)); json.dump(d, open("vo/durations.json","w"))
