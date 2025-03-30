# from variables import PRINT_LEVEL
from enum import Enum
from datetime import datetime
import shutil

class Printing_Types(Enum):
    none        = 0 
    critical    = 1
    warning     = 2
    debug       = 3
### CONSTANTS TO CONTROL THE DEBUGGING TYPE OF THE APPLICATION (PRINTING)

PRINT_LEVEL = Printing_Types.none # Change value here to redefine level of printing

def custom_print(*args, level:Printing_Types =Printing_Types.debug,sep=" ", end="\n"):
    """
    Custom print function that accepts multiple arguments, just like the built-in print.
    But in variables.py can be adjust the level of printing in console.
    - *args: Any number of arguments to print.
    - level: The message's severity level (default: "debug"). Values ["critical","warning","debug"]
    - sep: Separator between arguments (default: a single space).
    - end: End character (default: a newline).
    """
    # Determine if the message should be printed
    if PRINT_LEVEL.value < level.value or PRINT_LEVEL == Printing_Types.none:
        return
    
    # Join the arguments and print them
    message = sep.join(map(str, args))
    print(message, end=end)

def get_current_timestamp():
    return datetime.now().timestamp()

def modify_config(key, new_value,file_path = '.env'):
    """Method to modify .env need to verify mqtt id installation is correct
    """
    backup_path = file_path + ".bak"
    modified = False
    # Create a backup before modifying
    try:
        shutil.copy(file_path, backup_path)
    except IOError as e:
        print(f"Error creating backup: {e}")
        return modified

    try:
        with open(file_path, "r") as file:
            lines = file.readlines()

        with open(file_path, "w") as file:
            for line in lines:
                if line.startswith(key + "="):
                    file.write(f"{key}={new_value}\n")
                    modified = True
                else:
                    file.write(line)

        if modified:
            print(f"Successfully updated '{key}' in {file_path}")
        else:
            print(f"Key '{key}' not found, no changes made.")
        
    except Exception as e:
        # Restore backup if an error occurs
        shutil.copy(backup_path, file_path)
        print(f"Error modifying file: {e}")
        print("Backup restored.")
    finally:
        return modified

if '__main__'==__name__:
    value = 15
    custom_print("Hello","There",f"{value}.",level=Printing_Types.debug)

