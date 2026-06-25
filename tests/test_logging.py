import unittest
import logging

class TestLoggingConfiguration(unittest.TestCase):
    def test_logging_level_is_info_or_lower(self):
        # Import app.main to trigger logging initialization
        import app.main
        
        root_logger = logging.getLogger()
        # The default log level is WARNING (30). INFO is (20).
        # We assert that the root logger is configured to INFO or below.
        self.assertLessEqual(root_logger.getEffectiveLevel(), logging.INFO)

if __name__ == "__main__":
    unittest.main()
