import sqlite3
conn = sqlite3.connect('clipforge.db')
c = conn.cursor()
for sql in [
    "ALTER TABLE jobs ADD COLUMN license_key TEXT",
    "ALTER TABLE jobs ADD COLUMN plan TEXT DEFAULT 'free'",
    "ALTER TABLE licenses ADD COLUMN email TEXT",
    "ALTER TABLE licenses ADD COLUMN order_id TEXT",
    "ALTER TABLE licenses ADD COLUMN jobs_used INTEGER DEFAULT 0",
]:
    try:
        c.execute(sql)
        print("OK:", sql[:60])
    except Exception as e:
        print("SKIP:", str(e)[:60])
conn.commit()
conn.close()
print("Migration done!")
