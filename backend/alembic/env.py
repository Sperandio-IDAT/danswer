import asyncio
from logging.config import fileConfig

from alembic import context
from danswer.db.engine import build_connection_string
from danswer.db.models import Base
from sqlalchemy import pool, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from celery.backends.database.session import ResultModelBase  # type: ignore
from sqlalchemy.schema import SchemaItem

# Alembic Config object
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None and config.attributes.get(
    "configure_logger", True
):
    fileConfig(config.config_file_name)

# Add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = [Base.metadata, ResultModelBase.metadata]


def get_schema_options() -> str:
    x_args_raw = context.get_x_argument()
    x_args = {}
    for arg in x_args_raw:
        for pair in arg.split(","):
            if "=" in pair:
                key, value = pair.split("=", 1)
                x_args[key] = value
    print(x_args_raw)
    schema_name = x_args.get("schema", "public")
    return schema_name


EXCLUDE_TABLES = {"kombu_queue", "kombu_message"}


def include_object(
    object: SchemaItem,
    name: str,
    type_: str,
    reflected: bool,
    compare_to: SchemaItem | None,
) -> bool:
    if type_ == "table" and name in EXCLUDE_TABLES:
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = build_connection_string()
    schema = get_schema_options()

    context.configure(
        url=url,
        target_metadata=target_metadata,  # type: ignore
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=schema,
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    schema = get_schema_options()
    print("schema is", schema)

    connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
    connection.execute(text("COMMIT"))

    connection.execute(text(f'SET search_path TO "{schema}"'))

    context.configure(
        connection=connection,
        target_metadata=target_metadata,  # type: ignore
        version_table_schema=schema,
        include_schemas=True,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    print("Running async migrations")
    """Run migrations in 'online' mode."""
    connectable = create_async_engine(
        build_connection_string(),
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
