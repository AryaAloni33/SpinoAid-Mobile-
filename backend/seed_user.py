import sys
import os

def info():
    print("NOTE: MongoDB has been removed from this project.")
    print("Data is now stored locally in the browser memory (localStorage).")
    print("Seeding the backend database is no longer necessary as the frontend handles its own storage.")

if __name__ == "__main__":
    info()
