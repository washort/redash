import os
import subprocess
import sys

from redash.query_runner import *


def query_to_script_path(path, query):
    if path != "*":
        script = os.path.join(path, query.split(" ")[0])
        if not os.path.exists(script):
            raise IOError("Script '{}' not found in script directory".format(query))

        return os.path.join(path, query).split(" ")

    return query


def run_script(script, shell):
    output = subprocess.check_output(script, shell=shell)
    if output is None:
        return None, "Error reading output"

    output = output.strip()
    if not output:
        return None, "Empty output from script"

    return output, None


class Script(BaseQueryRunner):
    configuration_properties = {
        'path': {
            'type': 'string',
            'title': 'Scripts path'
        },
        'shell': {
            'type': 'boolean',
            'title': 'Execute command through the shell'
        },
        "toggle_table_string": {
            "type": "string",
            "title": "Toggle Table String",
            "default": "_v",
            "info": "This string will be used to toggle visibility of tables in the schema browser when editing a query in order to remove non-useful tables from sight."
        },
    }

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def enabled(cls):
        return "check_output" in subprocess.__dict__

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': cls.configuration_properties,
            'required': ['path']
        }

    @classmethod
    def type(cls):
        return "insecure_script"

    def __init__(self, configuration):
        super(Script, self).__init__(configuration)

        # If path is * allow any execution path
        if self.configuration["path"] == "*":
            return

        # Poor man's protection against running scripts from outside the scripts directory
        if self.configuration["path"].find("../") > -1:
            raise ValueError("Scripts can only be run from the configured scripts directory")

    def test_connection(self):
        pass

    def run_query(self, query, user):
        try:
            script = query_to_script_path(self.configuration["path"], query)
            return run_script(script, self.configuration['shell'])
        except IOError as e:
            return None, e.message
        except subprocess.CalledProcessError as e:
            return None, str(e)
        except KeyboardInterrupt:
            return None, "Query cancelled by user."


register(Script)
