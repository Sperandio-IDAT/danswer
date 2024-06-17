import csv
import io
import uuid

from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from danswer.auth.users import current_admin_user
from danswer.configs.constants import FileOrigin
from danswer.db.chat import get_chat_sessions_skeleton
from danswer.db.chat import get_empty_chat_messages_entries
from danswer.db.engine import get_session
from danswer.db.models import User
from danswer.file_store.file_store import FileStore
from danswer.file_store.file_store import get_default_file_store

router = APIRouter()


# TODO: can probably merge these helpers into one and use __annotations__ to get fields and headers
def generate_chat_messages_report(
    db_session: Session, file_store: FileStore, report_id: str
) -> None:
    messages = get_empty_chat_messages_entries(db_session)
    # write to memory buffer and store using pg_file_store
    with io.StringIO() as csvbuf:
        csvwriter = csv.writer(csvbuf, delimiter=",")
        csvwriter.writerow(["message_id", "chat_session_id", "time_sent"])
        for m in messages:
            csvwriter.writerow([m.message_id, m.chat_session_id, m.time_sent])

        # after writing seek to begining of buffer
        csvbuf.seek(0)
        file_store.save_file(
            file_name=f"{report_id}_chat_messages",
            content=csvbuf,
            display_name=f"{report_id}_chat_messages",
            file_origin=FileOrigin.OTHER,
            file_type="text/csv",
        )


def generate_chat_sessions_report(
    db_session: Session, file_store: FileStore, report_id: str
) -> None:
    sessions = get_chat_sessions_skeleton(db_session)
    # write to memory buffer and store using pg_file_store
    with io.StringIO() as csvbuf:
        csvwriter = csv.writer(csvbuf, delimiter=",")
        csvwriter.writerow(
            ["session_id", "user_id", "one_shot", "time_created", "time_updated"]
        )

        for s in sessions:
            csvwriter.writerow(
                [s.session_id, s.user_id, s.one_shot, s.time_created, s.time_updated]
            )

        # after writing seek to begining of buffer
        csvbuf.seek(0)
        file_store.save_file(
            file_name=f"{report_id}_chat_sessions",
            content=csvbuf,
            display_name=f"{report_id}_chat_sessions",
            file_origin=FileOrigin.OTHER,
            file_type="text/csv",
        )


@router.post("/admin/generate-report")
async def generate_report(
    _: User | None = Depends(current_admin_user),
    db_session: Session = Depends(get_session),
) -> list[str]:
    report_id = str(uuid.uuid4())
    file_store = get_default_file_store(db_session)

    generate_chat_messages_report(db_session, file_store, report_id)
    generate_chat_sessions_report(db_session, file_store, report_id)

    return ["Success"]
