from neomodel import (
    StructuredNode,
    StringProperty
)


class Message(StructuredNode):
    greeting_message = StringProperty(unique_index=True, required=True)

