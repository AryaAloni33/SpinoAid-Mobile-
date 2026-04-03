"""
MongoDB connection manager - REMOVED
The project now stores data locally in the browser memory (localStorage).
This file is kept only for backward compatibility with existing backend routes,
but it no longer connects to any database.
"""

class MockObjectId:
    def __init__(self, id=None):
        self.id = id or "mock_id"
    def __str__(self):
        return str(self.id)
    def __repr__(self):
        return f"ObjectId('{self.id}')"

ObjectId = MockObjectId

class MockCollection:
    def find(self, *args, **kwargs): return []
    def find_one(self, *args, **kwargs): return None
    def insert_one(self, *args, **kwargs): 
        class MockResult: inserted_id = "mock_id"
        return MockResult()
    def update_one(self, *args, **kwargs): 
        class MockResult: matched_count = 0; modified_count = 0
        return MockResult()
    def delete_one(self, *args, **kwargs):
        class MockResult: deleted_count = 0
        return MockResult()
    def create_index(self, *args, **kwargs): pass

class MockDB:
    def __getitem__(self, name): return MockCollection()

db = MockDB()

# Collections (MOCKED)
users_collection = MockCollection()
patients_collection = MockCollection()
annotations_collection = MockCollection()

def get_db():
    return db
