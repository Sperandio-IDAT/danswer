from danswer.auth.users import current_admin_user
from danswer.danswerbot.slack.config import validate_channel_names
from danswer.danswerbot.slack.tokens import fetch_tokens, save_tokens
from danswer.db.constants import SLACK_BOT_PERSONA_PREFIX
from danswer.db.engine import get_session
from danswer.db.models import ChannelConfig, User
from danswer.db.persona import get_persona_by_id
from danswer.db.slack_app import (
    fetch_slack_app,
    fetch_slack_apps,
    insert_slack_app,
    remove_slack_app,
    update_slack_app,
)
from danswer.db.slack_bot_config import (
    create_slack_bot_persona,
    fetch_slack_bot_config,
    fetch_slack_bot_configs,
    insert_slack_bot_config,
    remove_slack_bot_config,
    update_slack_bot_config,
)
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.server.manage.models import (
    SlackApp,
    SlackAppCreationRequest,
    SlackBotConfig,
    SlackBotConfigCreationRequest,
    SlackBotTokens,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/manage")


def _form_channel_config(
    slack_bot_config_creation_request: SlackBotConfigCreationRequest,
    current_slack_bot_config_id: int | None,
    db_session: Session,
) -> ChannelConfig:
    raw_channel_names = slack_bot_config_creation_request.channel_names
    respond_tag_only = slack_bot_config_creation_request.respond_tag_only
    respond_team_member_list = (
        slack_bot_config_creation_request.respond_team_member_list
    )
    respond_slack_group_list = (
        slack_bot_config_creation_request.respond_slack_group_list
    )
    answer_filters = slack_bot_config_creation_request.answer_filters
    follow_up_tags = slack_bot_config_creation_request.follow_up_tags

    if not raw_channel_names:
        raise HTTPException(
            status_code=400,
            detail="Must provide at least one channel name",
        )

    try:
        cleaned_channel_names = validate_channel_names(
            app_id=slack_bot_config_creation_request.app_id,
            channel_names=raw_channel_names,
            current_slack_bot_config_id=current_slack_bot_config_id,
            db_session=db_session,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    if respond_tag_only and (respond_team_member_list or respond_slack_group_list):
        raise ValueError(
            "Cannot set DanswerBot to only respond to tags only and "
            "also respond to a predetermined set of users."
        )

    channel_config: ChannelConfig = {
        "channel_names": cleaned_channel_names,
    }
    if respond_tag_only is not None:
        channel_config["respond_tag_only"] = respond_tag_only
    if respond_team_member_list:
        channel_config["respond_team_member_list"] = respond_team_member_list
    if respond_slack_group_list:
        channel_config["respond_slack_group_list"] = respond_slack_group_list
    if answer_filters:
        channel_config["answer_filters"] = answer_filters
    if follow_up_tags is not None:
        channel_config["follow_up_tags"] = follow_up_tags

    channel_config[
        "respond_to_bots"
    ] = slack_bot_config_creation_request.respond_to_bots

    return channel_config


@router.post("/admin/slack-bot/config")
def create_slack_bot_config(
    slack_bot_config_creation_request: SlackBotConfigCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> SlackBotConfig:
    channel_config = _form_channel_config(
        slack_bot_config_creation_request, None, db_session
    )

    persona_id = None
    if slack_bot_config_creation_request.persona_id is not None:
        persona_id = slack_bot_config_creation_request.persona_id
    elif slack_bot_config_creation_request.document_sets:
        persona_id = create_slack_bot_persona(
            db_session=db_session,
            channel_names=channel_config["channel_names"],
            document_set_ids=slack_bot_config_creation_request.document_sets,
            existing_persona_id=None,
        ).id

    slack_bot_config_model = insert_slack_bot_config(
        app_id=slack_bot_config_creation_request.app_id,
        persona_id=persona_id,
        channel_config=channel_config,
        response_type=slack_bot_config_creation_request.response_type,
        db_session=db_session,
    )
    return SlackBotConfig.from_model(slack_bot_config_model)


@router.patch("/admin/slack-bot/config/{slack_bot_config_id}")
def patch_slack_bot_config(
    slack_bot_config_id: int,
    slack_bot_config_creation_request: SlackBotConfigCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> SlackBotConfig:
    channel_config = _form_channel_config(
        slack_bot_config_creation_request, slack_bot_config_id, db_session
    )

    persona_id = None
    if slack_bot_config_creation_request.persona_id is not None:
        persona_id = slack_bot_config_creation_request.persona_id
    elif slack_bot_config_creation_request.document_sets:
        existing_slack_bot_config = fetch_slack_bot_config(
            db_session=db_session, slack_bot_config_id=slack_bot_config_id
        )
        if existing_slack_bot_config is None:
            raise HTTPException(
                status_code=404,
                detail="Slack bot config not found",
            )

        existing_persona_id = existing_slack_bot_config.persona_id
        if existing_persona_id is not None:
            persona = get_persona_by_id(
                persona_id=existing_persona_id,
                user=None,
                db_session=db_session,
                is_for_edit=False,
            )

            if not persona.name.startswith(SLACK_BOT_PERSONA_PREFIX):
                # Don't update actual non-slackbot specific personas
                # Since this one specified document sets, we have to create a new persona
                # for this DanswerBot config
                existing_persona_id = None
            else:
                existing_persona_id = existing_slack_bot_config.persona_id

        persona_id = create_slack_bot_persona(
            db_session=db_session,
            channel_names=channel_config["channel_names"],
            document_set_ids=slack_bot_config_creation_request.document_sets,
            existing_persona_id=existing_persona_id,
        ).id

    slack_bot_config_model = update_slack_bot_config(
        slack_bot_config_id=slack_bot_config_id,
        persona_id=persona_id,
        channel_config=channel_config,
        response_type=slack_bot_config_creation_request.response_type,
        db_session=db_session,
    )
    return SlackBotConfig.from_model(slack_bot_config_model)


@router.delete("/admin/slack-bot/config/{slack_bot_config_id}")
def delete_slack_bot_config(
    slack_bot_config_id: int,
    db_session: Session = Depends(get_session),
    user: User | None = Depends(current_admin_user),
) -> None:
    remove_slack_bot_config(
        slack_bot_config_id=slack_bot_config_id, user=user, db_session=db_session
    )


@router.get("/admin/slack-bot/config")
def list_slack_bot_configs(
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> list[SlackBotConfig]:
    slack_bot_config_models = fetch_slack_bot_configs(db_session=db_session)
    return [
        SlackBotConfig.from_model(slack_bot_config_model)
        for slack_bot_config_model in slack_bot_config_models
    ]


@router.post("/admin/slack-bot/apps")
def create_app(
    slack_app_creation_request: SlackAppCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> SlackApp:
    slack_app_model = insert_slack_app(
        name=slack_app_creation_request.name,
        description=slack_app_creation_request.description,
        enabled=slack_app_creation_request.enabled,
        bot_token=slack_app_creation_request.bot_token,
        app_token=slack_app_creation_request.app_token,
        db_session=db_session,
    )
    return SlackApp.from_model(slack_app_model)


@router.patch("/admin/slack-bot/apps/{slack_app_id}")
def patch_app(
    slack_app_id: int,
    slack_app_creation_request: SlackAppCreationRequest,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> SlackApp:
    slack_app_model = update_slack_app(
        slack_app_id=slack_app_id,
        name=slack_app_creation_request.name,
        description=slack_app_creation_request.description,
        enabled=slack_app_creation_request.enabled,
        bot_token=slack_app_creation_request.bot_token,
        app_token=slack_app_creation_request.app_token,
        db_session=db_session,
    )
    return SlackApp.from_model(slack_app_model)


@router.delete("/admin/slack-bot/apps/{slack_app_id}")
def delete_app(
    slack_app_id: int,
    db_session: Session = Depends(get_session),
    user: User | None = Depends(current_admin_user),
) -> None:
    remove_slack_app(slack_app_id=slack_app_id, user=user, db_session=db_session)


@router.get("/admin/slack-bot/apps/{app_id}")
def get_app_by_id(
    app_id: int,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> SlackApp:
    slack_app_model = fetch_slack_app(db_session=db_session, slack_app_id=app_id)
    return SlackApp.from_model(slack_app_model)


@router.get("/admin/slack-bot/apps")
def list_apps(
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> list[SlackApp]:
    slack_app_models = fetch_slack_apps(db_session=db_session)
    return [
        SlackApp.from_model(slack_app_model) for slack_app_model in slack_app_models
    ]


@router.get("/admin/slack-bot/apps/{slack_app_id}/config")
def list_app_configs(
    slack_app_id: int,
    db_session: Session = Depends(get_session),
    _: User | None = Depends(current_admin_user),
) -> list[SlackBotConfig]:
    slack_bot_config_models = fetch_slack_bot_configs(
        db_session=db_session, slack_bot_app_id=slack_app_id
    )
    return [
        SlackBotConfig.from_model(slack_bot_config_model)
        for slack_bot_config_model in slack_bot_config_models
    ]
