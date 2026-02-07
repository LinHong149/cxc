from snowflake.connector import connect
from snowflake.core import Root

# 1. Establish the connection
# Replace the placeholder values with your actual credentials
conn = connect(
    user="ASWALFREDZ",
    password="mymxa3=duwXuv=tanneb",
    account="NECSKDH-ME46266",  # e.g. "xy12345.us-east-1"
    role="ACCOUNTADMIN"                 # Or the role that owns the stage
)

# 2. Create the Root object entry point
root = Root(conn)

# 3. Navigate to your specific Stage
# Based on your screenshot: Database="CXC1", Schema="PUBLIC", Stage="CXC"
my_db = root.databases["CXC1"]
my_schema = my_db.schemas["PUBLIC"]
my_stage = my_schema.stages["CXC"]

# 4. List files and print their details
print(f"Listing files in stage: {my_stage.name}...")

# .list_files() returns an iterator of StageFile objects
file_iterator = my_stage.list_files() 

for file in file_iterator:
    print(f"File: {file.name}, Size: {file.size} bytes")

# Close the connection
conn.close()