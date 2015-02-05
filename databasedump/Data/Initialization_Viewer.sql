CREATE DATABASE  IF NOT EXISTS ${db.name};

ALTER DATABASE ${db.name} CHARACTER SET latin1;
ALTER DATABASE ${db.name} COLLATE latin1_general_cs;

USE ${db.name};

DROP procedure IF EXISTS `create_user_if_not_exists`;
#
CREATE PROCEDURE `create_user_if_not_exists`()
BEGIN
	DECLARE isExist BIGINT DEFAULT 0;
	SELECT
		COUNT(*) INTO isExist 
	FROM
		mysql.user
	WHERE
		User = '${db.user}' AND
		Host = '%';
		
	IF isExist = 0 THEN
		CREATE USER '${db.user}'@'%' IDENTIFIED BY '${db.password}';		 
	END IF;
	
	SELECT
		COUNT(*) INTO isExist 
	FROM
		mysql.user
	WHERE
		User = '${db.user}' AND
		Host = 'localhost';
	  
	IF isExist = 0 THEN
		CREATE USER '${db.user}'@'localhost' IDENTIFIED BY '${db.password}';		 
	END IF;	
END
#

CALL create_user_if_not_exists() ;

DROP PROCEDURE IF EXISTS create_user_if_not_exists ;

GRANT SELECT ON ${db.name}.* TO '${db.user}'@'%';
REVOKE ALL PRIVILEGES ON ${db.name}.* FROM '${db.user}'@'%';
GRANT EXECUTE ON ${db.name}.* TO '${db.user}'@'%';

GRANT SELECT ON ${db.name}.* TO '${db.user}'@'localhost';
REVOKE ALL PRIVILEGES ON ${db.name}.* FROM '${db.user}'@'localhost';
GRANT EXECUTE ON ${db.name}.* TO '${db.user}'@'localhost';

FLUSH PRIVILEGES;