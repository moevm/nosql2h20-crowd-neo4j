from flask import Flask
from flask_restful import Api

from crowdsourcing.db import init_db
from crowdsourcing.views import MessageView


init_db()

app = Flask(__name__)
app.config['BUNDLE_ERRORS'] = True

api = Api(app)


api.add_resource(MessageView, '/messages/')


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0')

