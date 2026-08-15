from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class ClaimSchema(BaseModel):
    text: str
    evidenceIds: List[str] = Field(default_factory=list)
    verified: bool = True
    flagged: Optional[List[str]] = None


class ChapterSchema(BaseModel):
    index: int
    title: str
    kicker: str
    claims: List[ClaimSchema] = Field(default_factory=list)
    deterministic: Optional[bool] = None


class NarrativeSchema(BaseModel):
    chapters: List[ChapterSchema] = Field(default_factory=list)
    summary: Optional[str] = None
    verifiedClaimCount: int = 0
    droppedClaimCount: int = 0
    dropReasons: List[str] = Field(default_factory=list)


class CuratedProjectSchema(BaseModel):
    repoId: int
    name: str
    fullName: str
    htmlUrl: str
    description: Optional[str] = None
    language: Optional[str] = None
    stargazersCount: int = 0
    forksCount: int = 0
    pushedAt: str = ""
    createdAt: Optional[str] = None
    customNote: str = ""
    priority: int = 0


class PublicProfileSchema(BaseModel):
    username: str
    name: Optional[str] = None
    avatarUrl: str
    bio: Optional[str] = None
    location: Optional[str] = None
    company: Optional[str] = None
    blog: Optional[str] = None
    publicRepos: int = 0
    followers: int = 0
    following: int = 0
    createdAt: str = ""

    narrative: NarrativeSchema
    tone: str = "Professional"
    customPrompt: Optional[str] = None
    isApproved: bool = True

    curatedProjects: List[CuratedProjectSchema] = Field(default_factory=list)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    patterns: List[Dict[str, Any]] = Field(default_factory=list)

    publishedAt: str = ""
    canonicalUrl: str = ""


class PublicProfileResponse(BaseModel):
    status: str = "ok"
    profile: PublicProfileSchema
