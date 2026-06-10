from pathlib import Path

f = Path("/opt/dclic/backend/server.py")
content = f.read_text(encoding="utf-8")

old = '''    payload = _json.dumps({"channel":"sms","campaign-type":"transac","recipients":[{"phone":phone}],"from":SWEEGO_SENDER,"message-txt":message}).encode("utf-8")'''

new = '''    payload = _json.dumps({"channel":"sms","provider":"sweego","campaign-type":"transac","recipients":[{"num":phone,"region":"FR"}],"from":SWEEGO_SENDER,"message-txt":message}).encode("utf-8")'''

if old in content:
    content = content.replace(old, new, 1)
    f.write_text(content, encoding="utf-8")
    print("OK : payload SMS corrigé")
else:
    print("NON TROUVE")
