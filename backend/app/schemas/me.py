from pydantic import BaseModel


class Profile(BaseModel):
    name: str
    email: str
    avatar_url: str | None = None
