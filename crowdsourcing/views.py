from flask_restful import (
    Resource,
    reqparse
)
from neomodel.exception import UniqueProperty

from crowdsourcing.models import Message


class MessageView(Resource):
    def get(self):
        return [message.__properties__ for message in Message.nodes.all()]

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument(
            'greeting_message',
            type=str,
            required=True,
        )
        args = parser.parse_args()
        message = {
            'greeting_message': args['greeting_message']
        }

        try:
            message = Message(**message).save()
        except UniqueProperty as e:
            return {
                "error": str(e)
            }, 400

        return message.__properties__, 201

