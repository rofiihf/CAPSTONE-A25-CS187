# app/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from app.maintenance import rebuild_all

sched = None

def start_scheduler():
    global sched
    if sched is not None:
        return

    sched = BackgroundScheduler()

    # run rebuild every 24 hours
    sched.add_job(
        rebuild_all,
        'interval',
        hours=24,
        id='rebuild_all'
    )

    sched.start()
    print("Scheduler started: rebuild_all every 3 hours")
