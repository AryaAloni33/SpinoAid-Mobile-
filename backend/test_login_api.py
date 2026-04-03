import requests

def test_login():
    url = "http://localhost:8000/auth/login"
    payload = {
        "email": "test@gmail.com",
        "password": "test1234"
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")
        if response.status_code == 200:
            print("Login Successful!")
        else:
            print("Login Failed.")
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    test_login()
