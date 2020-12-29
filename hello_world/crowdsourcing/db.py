from neomodel import config


def init_db():
    config.DATABASE_URL = 'neo4j://neo4j:@neo4j:7687'

