<?php
    session_start();
?>

<!DOCTYPE html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="stylesheet" href="proStyle.css">
</head>

<body class="menu-bg">
    <header class="header">
        <a href="#" class="logo">D & D Foods</a>
        <nav class="navbar">
            <a href="index.php">Menu</a>
            <a href="checkout.php">Checkout</a>
            <a href="history.php">History</a>
            <a href="login.php">Login</a>
        </nav>
    </header>
</body>

<body>
    <div class="container">
        <?php
            if(isset($_POST["submit"])){
                $name= $_POST["name"];
                $email= $_POST["email"];
                $password= trim($_POST["password"]);

                $passwordHash= password_hash($password, PASSWORD_DEFAULT);

                // checks to see if all the fields are filled out correctly by the user
                $errors = array();
                if(empty($name)||empty($email) ||empty($password) ){
                    array_push($errors, "All fields are required");
                }
                if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
                    array_push($errors, "Email is not valid");
                }
                if(strlen($password) <8){
                    array_push($errors, "Password needs to be at least 8 characters long");
                }

                require_once "server.php";
                $sql= "SELECT * from person where email= '$email'";
                $result= mysqli_query($conn, $sql);
                $rowcount= mysqli_num_rows($result);
                if ($rowcount >0){
                   array_push($errors, "Email already in use");
                }

                if(count($errors)>0){    //doesn't insert data if there are errors
                    foreach($errors as $error){
                        echo "<div class ='alert alert-danger'> $error</div>";
                    }
                } else{     //insert if no errors
                    require_once "server.php";
                    $sql ="INSERT INTO person (person_name, email, password) values (?,?,?)";
                    $stmt= mysqli_stmt_init($conn);
                    $prepare= mysqli_stmt_prepare($stmt,$sql);

                    if($prepare){
                        mysqli_stmt_bind_param($stmt, "sss",$name, $email, $passwordHash);
                        mysqli_stmt_execute($stmt);
                        $_SESSION['r_success'] = true;
                        header("Location: login.php");
                    } else {
                        die("Registerion Unsuccessful");
                    }
                }
            }
        ?>
        <form action="sign_up.php" method="post">
            <div class="form-group">
                <input type="text" class="form-control" name="name" placeholder="Enter Name:">
            </div>
            <div class="form-group">
                <input type="email" class="form-control" name="email" placeholder="Enter Email:">
            </div>
            <div class="form-group">
                <input type="password" class="form-control" name="password" placeholder="Enter Password:">
            </div>
            <div class="form-group">
                <input type="submit" class="btn btn-primary" value="Register" name="submit">
            </div>
        </form>
        <p>Already Registered? <a href="login.php"> Login here </p>
    </div>
</body>