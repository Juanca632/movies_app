
class Provider():
    id: int
    name: str
    logo_path: str

class Star():
    id: int
    name: str
    biography: str

class Media():
    id: int
    title: str
    description: str
    providers: list[Provider]
    casting: list[Star]
    images: list[str]
    rating: float

class Movie(Media):
    pass

class Serie(Media):
    pass