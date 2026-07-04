from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from app.core.auth import get_current_user, security
from app.services.database import DatabaseService
from app.schemas.share import (
    CreateShareRequest, SharedTranscriptResponse, ShareMetadataResponse,
    SubmitRatingRequest, RatingResponse
)
from typing import List
import secrets

router = APIRouter(prefix="/shares", tags=["sharing"])

@router.post(
    "/transcripts",
    response_model=ShareMetadataResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Share/publish a translated transcript",
)
async def share_transcript(
    payload: CreateShareRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user: dict = Depends(get_current_user),
    db_service: DatabaseService = Depends(),
):
    """
    Publish a transcript with translation segments, applying a Creative Commons license.
    """
    owner_id = user.get("sub")
    if not owner_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User authentication failed."
        )
        
    share_token = secrets.token_urlsafe(16)
    
    try:
        shared_meta = await db_service.create_shared_transcript(
            owner_id=owner_id,
            share_token=share_token,
            payload=payload,
            user_token=credentials.credentials
        )
        return shared_meta
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create shared transcript: {str(e)}"
        )

@router.get(
    "/transcripts",
    response_model=List[ShareMetadataResponse],
    summary="List public shared transcripts for a video URL",
)
async def list_shared_transcripts(
    video_url: str,
    db_service: DatabaseService = Depends()
):
    """
    List all public shared transcripts for a given video URL.
    """
    try:
        shares = await db_service.get_shared_transcripts_by_video_url(video_url)
        return shares
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list shared transcripts: {str(e)}"
        )

@router.get(
    "/transcripts/{share_token}",
    response_model=SharedTranscriptResponse,
    summary="Get a shared transcript and segments",
)
async def get_shared_transcript(
    share_token: str,
    db_service: DatabaseService = Depends()
):
    """
    Retrieve a public shared transcript and its license metadata using its share token.
    """
    shared_data = await db_service.get_shared_transcript_by_token(share_token)
    if not shared_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared transcript not found."
        )
        
    await db_service.increment_share_views(share_token)
    return shared_data

@router.post(
    "/transcripts/{share_token}/ratings",
    response_model=RatingResponse,
    summary="Submit a rating for a shared script",
)
async def submit_rating(
    share_token: str,
    payload: SubmitRatingRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user: dict = Depends(get_current_user),
    db_service: DatabaseService = Depends()
):
    """
    Submit a 1-5 star rating and optional review comment for a shared script.
    If the user has already rated this script, it updates their previous rating.
    """
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User authentication failed."
        )

    shared_transcript = await db_service.get_shared_transcript_metadata_by_token(share_token)
    if not shared_transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared transcript not found."
        )

    if str(shared_transcript["owner_id"]) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot rate your own shared script."
        )

    try:
        rating_data = await db_service.upsert_transcript_rating(
            shared_transcript_id=shared_transcript["id"],
            user_id=user_id,
            rating=payload.rating,
            review_comment=payload.review_comment,
            user_token=credentials.credentials
        )
        return rating_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit rating: {str(e)}"
        )

@router.get(
    "/transcripts/{share_token}/ratings",
    response_model=List[RatingResponse],
    summary="Get all ratings for a shared script",
)
async def get_ratings(
    share_token: str,
    db_service: DatabaseService = Depends()
):
    """
    Get all ratings and review comments for a shared script.
    """
    shared_transcript = await db_service.get_shared_transcript_metadata_by_token(share_token)
    if not shared_transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared transcript not found."
        )

    return await db_service.get_ratings_for_transcript(shared_transcript["id"])

@router.post(
    "/transcripts/{share_token}/clone",
    response_model=ShareMetadataResponse,
    summary="Clone a shared transcript to user workspace",
)
async def clone_shared_transcript(
    share_token: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user: dict = Depends(get_current_user),
    db_service: DatabaseService = Depends()
):
    """
    Clone someone else's shared transcript into the current user's profile context.
    """
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User authentication failed."
        )

    original = await db_service.get_shared_transcript_by_token(share_token)
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared transcript not found."
        )

    if str(original["owner_id"]) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot clone your own shared script."
        )

    try:
        new_share_token = secrets.token_urlsafe(16)
        cloned_meta = await db_service.clone_shared_transcript(
            original_id=original["id"],
            new_owner_id=user_id,
            new_share_token=new_share_token,
            original_data=original,
            user_token=credentials.credentials
        )
        await db_service.increment_share_clones(original["id"])
        return cloned_meta
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clone shared transcript: {str(e)}"
        )
